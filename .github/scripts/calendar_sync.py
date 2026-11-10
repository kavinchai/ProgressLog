"""Mirror ProgressLog workouts or weigh-ins onto a Google Calendar.

    python calendar_sync.py workout|weight

Each run reconciles a window of days (default: the last 14 days, ending
yesterday) instead of only yesterday, so it:
  - creates events for days you logged late,
  - updates events whose data you corrected (weight, sets, session name, date),
  - deletes events whose data you deleted in the app.

Events the script manages carry a private extended property (KEY_PROP) holding
the record they mirror ("workout-<session id>" / "weight-<date>"). Older events
created before that property existed are matched by day + title and adopted.
Anything else on the calendar is never touched.

Environment:
  RAILWAY_DATABASE_URL, GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_CALENDAR_ID,
  DB_USERNAME            required
  LOOKBACK_DAYS          days to reconcile, ending yesterday (default 14)
  TARGET_DATE            YYYY-MM-DD: reconcile just that day
  BACKFILL               "true": reconcile all history
  DRY_RUN                "true": print the plan, change nothing
  CALENDAR_TZ            timezone that decides "yesterday" (default America/New_York)

The repository is public, so logs only ever show dates, actions and counts,
never weights, exercises, hosts or usernames.
"""
import json
import os
import sys
from collections import OrderedDict
from datetime import date, datetime, timedelta

KEY_PROP = "progresslog_key"


# ── Pure logic ──────────────────────────────────────────────────


def sync_window(today, lookback_days, target=None, backfill=False):
    """(start, end) dates to reconcile; start is None for a full backfill."""
    if target:
        return target, target
    end = today - timedelta(days=1)
    if backfill:
        return None, end
    return end - timedelta(days=lookback_days - 1), end


def _num(value):
    return f"{float(value):g}"


def desired_workout_events(rows):
    """rows: (session_id, date, name, exercise, set_number, reps, weight_lbs)."""
    sessions = OrderedDict()
    for session_id, day, name, exercise, set_number, reps, weight in rows:
        s = sessions.setdefault(
            session_id, {"date": str(day), "name": name, "exercises": OrderedDict()}
        )
        if exercise is not None:
            s["exercises"].setdefault(exercise, []).append((set_number, reps, weight))
    events = {}
    for session_id, s in sessions.items():
        lines = []
        for exercise, sets in s["exercises"].items():
            lines.append(exercise)
            lines.extend(
                f"  Set {n}: {_num(w)} lbs × {r}" for n, r, w in sets
            )
        events[f"workout-{session_id}"] = {
            "date": s["date"],
            "summary": s["name"],
            "description": "\n".join(lines),
        }
    return events


def desired_weight_events(rows):
    """rows: (log_date, weight_lbs). One weigh-in per day (unique in the DB)."""
    return {
        f"weight-{day}": {
            "date": str(day),
            "summary": f"Weight: {_num(weight)} lbs",
            "description": "",
        }
        for day, weight in rows
    }


def _event_date(event):
    return event.get("start", {}).get("date")


def _event_key(event):
    return event.get("extendedProperties", {}).get("private", {}).get(KEY_PROP)


def _legacy_matches(kind, event, body):
    if _event_date(event) != body["date"]:
        return False
    summary = event.get("summary", "")
    if kind == "weight":
        return summary.startswith("Weight:")
    return summary == body["summary"]


def _differs(event, body):
    return (
        event.get("summary", "") != body["summary"]
        or (event.get("description") or "") != body["description"]
        or _event_date(event) != body["date"]
    )


def plan_changes(kind, desired, events, start, end):
    """List of (action, event_id, key, body) to make the calendar match `desired`.

    action is "create" (event_id None), "update" or "delete" (body None).
    Only events dated inside [start, end] are ever deleted.
    """
    managed = {}
    legacy = []
    for e in events:
        key = _event_key(e)
        if key and key.startswith(f"{kind}-"):
            managed[key] = e
        elif not key:
            legacy.append(e)

    changes = []
    for key, body in desired.items():
        event = managed.get(key)
        if event is None:
            event = next((e for e in legacy if _legacy_matches(kind, e, body)), None)
            if event is not None:
                legacy.remove(event)
                changes.append(("update", event["id"], key, body))
            else:
                changes.append(("create", None, key, body))
        elif _differs(event, body):
            changes.append(("update", event["id"], key, body))

    for key, event in managed.items():
        day = _event_date(event)
        in_window = day is not None and (start is None or day >= str(start)) and day <= str(end)
        if key not in desired and in_window:
            changes.append(("delete", event["id"], key, None))
    return changes


def event_body(key, body):
    """Google Calendar all-day event (the end date is exclusive)."""
    day = date.fromisoformat(body["date"])
    return {
        "summary": body["summary"],
        "description": body["description"],
        "start": {"date": body["date"]},
        "end": {"date": str(day + timedelta(days=1))},
        "extendedProperties": {"private": {KEY_PROP: key}},
    }


# ── I/O ───────────────────────────────────────────────────────────────────────

QUERIES = {
    "workout": """
        SELECT ws.id, ws.session_date, COALESCE(ws.session_name, 'Workout'),
               es.exercise_name, es.set_number, es.reps, es.weight_lbs
        FROM workout_session ws
        JOIN users u ON u.id = ws.user_id
        LEFT JOIN exercise_set es ON es.session_id = ws.id
        WHERE u.username = %(user)s
          AND (%(start)s::date IS NULL OR ws.session_date >= %(start)s::date)
          AND ws.session_date <= %(end)s::date
        ORDER BY ws.session_date, ws.id, es.exercise_name, es.set_number
    """,
    "weight": """
        SELECT wl.log_date, wl.weight_lbs
        FROM weight_log wl
        JOIN users u ON u.id = wl.user_id
        WHERE u.username = %(user)s
          AND (%(start)s::date IS NULL OR wl.log_date >= %(start)s::date)
          AND wl.log_date <= %(end)s::date
        ORDER BY wl.log_date
    """,
}


def fail(message):
    print(f"::error::{message}")
    sys.exit(1)


def load_rows(kind, start, end):
    import psycopg2

    conn = psycopg2.connect(
        os.environ["RAILWAY_DATABASE_URL"], sslmode="require", connect_timeout=15
    )
    try:
        with conn.cursor() as cur:
            user = os.environ["DB_USERNAME"]
            cur.execute("SELECT 1 FROM users WHERE username = %s", (user,))
            if cur.fetchone() is None:
                fail("DB_USERNAME does not match any user")
            cur.execute(QUERIES[kind], {"user": user, "start": start, "end": end})
            return cur.fetchall()
    finally:
        conn.close()


def calendar_service():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds = service_account.Credentials.from_service_account_info(
        json.loads(os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"]),
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def list_events(service, calendar_id, start, end):
    """All single events whose day could fall inside [start, end]."""
    lo = (start or date(2000, 1, 1)) - timedelta(days=1)
    hi = end + timedelta(days=2)
    events, token = [], None
    while True:
        page = (
            service.events()
            .list(
                calendarId=calendar_id,
                timeMin=f"{lo}T00:00:00Z",
                timeMax=f"{hi}T00:00:00Z",
                singleEvents=True,
                maxResults=2500,
                pageToken=token,
            )
            .execute()
        )
        events.extend(page.get("items", []))
        token = page.get("nextPageToken")
        if not token:
            return events


def main(argv):
    if len(argv) != 2 or argv[1] not in QUERIES:
        fail("usage: calendar_sync.py workout|weight")
    kind = argv[1]

    missing = [
        k
        for k in ("RAILWAY_DATABASE_URL", "GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_CALENDAR_ID", "DB_USERNAME")
        if not os.environ.get(k)
    ]
    if missing:
        fail(f"missing required secrets: {', '.join(missing)}")

    from zoneinfo import ZoneInfo

    today = datetime.now(ZoneInfo(os.environ.get("CALENDAR_TZ") or "America/New_York")).date()
    target = os.environ.get("TARGET_DATE", "").strip()
    try:
        target = date.fromisoformat(target) if target else None
        lookback = int(os.environ.get("LOOKBACK_DAYS") or 14)
    except ValueError as e:
        fail(f"bad input: {e}")
    if lookback < 1:
        fail("LOOKBACK_DAYS must be at least 1")
    backfill = os.environ.get("BACKFILL", "").lower() == "true"
    dry_run = os.environ.get("DRY_RUN", "").lower() == "true"

    start, end = sync_window(today, lookback, target, backfill)
    print(f"[{kind}] reconciling {start or 'all history'} → {end}{' (dry run)' if dry_run else ''}")

    if kind == "workout":
        desired = desired_workout_events(load_rows(kind, start, end))
    else:
        desired = desired_weight_events(load_rows(kind, start, end))

    from googleapiclient.errors import HttpError

    service = calendar_service()
    calendar_id = os.environ["GOOGLE_CALENDAR_ID"]
    try:
        events = list_events(service, calendar_id, start, end)
    except HttpError as e:
        fail(
            f"cannot read the calendar (HTTP {e.status_code}); check it is shared with the "
            "service account with 'Make changes to events'"
        )

    changes = plan_changes(kind, desired, events, start, end)
    counts = {"create": 0, "update": 0, "delete": 0}
    failed = 0
    for action, event_id, key, body in changes:
        day = body["date"] if body else _event_date(next(e for e in events if e["id"] == event_id))
        print(f"  {action:<6} {day}  {key}")
        if dry_run:
            counts[action] += 1
            continue
        try:
            if action == "create":
                service.events().insert(calendarId=calendar_id, body=event_body(key, body)).execute()
            elif action == "update":
                service.events().patch(
                    calendarId=calendar_id, eventId=event_id, body=event_body(key, body)
                ).execute()
            else:
                service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
            counts[action] += 1
        except HttpError as e:
            failed += 1
            print(f"::warning::{action} {key} failed (HTTP {e.status_code})")

    unchanged = len(desired) - counts["create"] - counts["update"]
    print(
        f"[{kind}] created={counts['create']} updated={counts['update']} "
        f"deleted={counts['delete']} unchanged={unchanged} failed={failed}"
    )
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv)
