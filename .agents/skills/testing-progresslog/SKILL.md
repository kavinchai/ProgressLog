---
name: testing-progresslog
description: How to run and test the ProgressLog frontend locally against the production backend, log in, and reach the History day-detail modal.
---

# Testing ProgressLog (frontend)

## Run the frontend against the production backend
No local backend/DB is normally set up. Easiest path is the vite dev server proxying `/api` to prod.

1. Edit `frontend/vite.config.js` → `server.proxy["/api"].target` to
   `https://progresslog-production-6ec4.up.railway.app` (keep `changeOrigin: true`).
2. **CORS + cookie gotcha:** the prod backend's CORS allow-list rejects any `Origin` header from
   localhost, so login returns **HTTP 403** through a plain proxy, and its auth cookie is `Secure`
   (dropped over http). Work around both by adding a `configure` hook to the proxy that removes the
   `origin`/`referer` request headers and strips `Secure` from `Set-Cookie`:
   ```js
   configure: (proxy) => {
     proxy.on("proxyReq", (r) => { r.removeHeader("origin"); r.removeHeader("referer"); });
     proxy.on("proxyRes", (res) => {
       const sc = res.headers["set-cookie"];
       if (sc) res.headers["set-cookie"] = sc.map((c) => c.replace(/;\s*Secure/gi, ""));
     });
   },
   ```
3. `cd frontend && npm ci` (if needed) then `npm run dev` (serves on :5173).
4. **Revert both edits when done** — do not commit the proxy target or the configure hook.

Alternative: `docker-compose up` runs postgres + backend + frontend locally with `COOKIE_SECURE=false`
and CORS `http://localhost:5173`, avoiding the proxy hacks (needs Docker, not always available).

## Reaching the day-detail modal (History)
- Route `/history/total` = "Full Log" month calendar (`TotalStats.jsx`). Click any past day cell
  (`data-testid="calendar-day-YYYY-MM-DD"`) to open a `Modal` containing `DayDetail`.
- Route `/history/weekly` = Weekly view; click a table row to expand an inline `DayDetail`
  (`WeeklyStats.jsx`). Weekly only shows the current week — no week navigation.
- `DayDetail.jsx` renders Weight / Nutrition / Steps / Workout sections; each header is
  `.day-detail-section-head` with `.day-detail-label` + `.btn-actions`. The Workout header shows
  `+ Add exercise` when the session has exercises, else `+ Add`.
- Good data for a named workout with many exercises: **7/25/26 → "Pickleball"** (7 exercises).

## Layout/overflow assertions
Measure via console (no devtools clicks needed for logic):
`.modal-body.scrollWidth > .modal-body.clientWidth` ⇒ horizontal scroll; compare a button's
`getBoundingClientRect().right` to `.modal-box`'s right edge to detect clipping. For mobile, use
Chrome device toolbar (Ctrl+Shift+M) and set width to 390.

## Devin Secrets Needed
None for this flow (public prod backend + shared test creds above). RAILWAY_TOKEN / VERCEL_TOKEN
exist for deployments but are not needed to test the frontend locally.
