#!/usr/bin/env python3
"""
Parse JUnit XML test results and emit a concise failure summary.

Writes to:
  - stdout (visible in the workflow log)
  - $GITHUB_STEP_SUMMARY (rendered on the workflow run page)

The output is designed to be copy-pasteable into an AI chat: each failure
shows the qualified test, a one-line message, and the most informative
source frame.

Usage:
  parse-junit.py <label> <glob> [<glob> ...]

Environment:
  DIAGNOSTICS_DIR   If set, the parser looks for <Class>.<method>.txt files
                    here (written by the FailureDiagnostics TestNG listener)
                    and inlines them into the failure summary so the dump is
                    pasteable into an AI chat without unzipping the artifact.
"""
import glob
import os
import re
import sys
import xml.etree.ElementTree as ET


def clip(s, n=240):
    s = (s or "").strip()
    if not s:
        return ""
    s = re.sub(r"\s+", " ", s)
    return s if len(s) <= n else s[:n].rstrip() + "..."


_FRAME_PATTERNS = [
    re.compile(r"at\s+com\.kavin\.[\w.$]+\(([^:)]+:\d+)\)"),
    re.compile(r"\(([^/\\)]+\.java:\d+)\)"),
    re.compile(r"([\w./\\-]+\.(?:jsx?|tsx?):\d+:\d+)"),
    re.compile(r"([\w./\\-]+\.(?:java|jsx?|tsx?):\d+)"),
]


def first_frame(stack):
    """Find the most informative frame.

    Iterate patterns in priority order — project-specific patterns first.
    For each pattern, scan the whole stack so a deeper project frame wins
    over a framework frame that appears earlier.
    """
    if not stack:
        return ""
    for p in _FRAME_PATTERNS:
        for line in stack.splitlines():
            m = p.search(line)
            if m:
                return m.group(1)
    return ""


def collect(globs):
    """Walk every matching JUnit XML and return (failures, skips).

    Skips are surfaced because TestNG's @BeforeClass/@BeforeMethod failures
    cascade as <skipped> entries on the dependent @Test methods, not <failure>.
    Without this, a broken setup looks like fewer failures, not more.
    """
    files = []
    for g in globs:
        files.extend(glob.glob(g, recursive=True))
    fails = []
    skips = []
    for f in files:
        try:
            tree = ET.parse(f)
        except ET.ParseError:
            continue
        for tc in tree.iter("testcase"):
            for child in tc:
                if child.tag in ("failure", "error"):
                    fails.append({
                        "kind": child.tag,
                        "classname": tc.get("classname", ""),
                        "name": tc.get("name", ""),
                        "message": clip(child.get("message") or child.text or ""),
                        "frame": first_frame(child.text or ""),
                    })
                elif child.tag == "skipped":
                    skips.append({
                        "classname": tc.get("classname", ""),
                        "name": tc.get("name", ""),
                        "message": clip(child.get("message") or child.text or ""),
                    })
    return fails, skips


def load_diagnostic(diag_dir, classname, name):
    """Read the matching FailureDiagnostics TXT dump if present.

    The Java side sanitizes the test name by replacing non-[a-zA-Z0-9._-] chars
    with underscores; mirror that here so the lookup matches.
    """
    if not diag_dir or not classname:
        return ""
    raw = f"{classname}.{name}"
    sanitized = re.sub(r"[^a-zA-Z0-9._-]", "_", raw)
    path = os.path.join(diag_dir, sanitized + ".txt")
    try:
        with open(path, encoding="utf-8") as fp:
            return fp.read().strip()
    except OSError:
        return ""


def render(label, fails, skips, diag_dir=None):
    out = [f"## {label}"]
    if not fails and not skips:
        out.append("")
        out.append("No failing or skipped tests recorded in JUnit XML.")
        return "\n".join(out) + "\n"

    if fails:
        out.append("")
        out.append(f"**{len(fails)} test failure(s)** - copy the block below for an AI fix request:")
        out.append("")
        out.append("```")
        for f in fails:
            label_line = f"{f['classname']}.{f['name']}" if f['classname'] else f['name']
            out.append(f"FAIL {label_line}")
            if f["message"]:
                out.append(f"     {f['kind']}: {f['message']}")
            if f["frame"]:
                out.append(f"     at {f['frame']}")
            out.append("")
        out.append("```")

        # If FailureDiagnostics produced per-test dumps, inline each one. These
        # blocks are sized to be copy-pasted directly into an AI chat: URL,
        # title, console errors, visible interactives, exception message.
        diag_blocks = []
        for f in fails:
            dump = load_diagnostic(diag_dir, f["classname"], f["name"])
            if dump:
                diag_blocks.append(dump)
        if diag_blocks:
            out.append("")
            out.append("<details>")
            out.append(f"<summary><strong>Failure context dumps ({len(diag_blocks)})</strong> - paste into an AI chat for debugging</summary>")
            out.append("")
            out.append("```")
            out.append("\n\n---\n\n".join(diag_blocks))
            out.append("```")
            out.append("")
            out.append("</details>")

    if skips:
        # Skipped tests usually mean a @BeforeClass/@BeforeMethod threw, so they
        # point at *real* problems hidden under the failure count. Show them in
        # a separate block to keep the AI-fix block above clean.
        out.append("")
        out.append(f"**{len(skips)} test(s) skipped** - usually a setup/before-class failure:")
        out.append("")
        out.append("```")
        for s in skips:
            label_line = f"{s['classname']}.{s['name']}" if s['classname'] else s['name']
            out.append(f"SKIP {label_line}")
            if s["message"]:
                out.append(f"     reason: {s['message']}")
            out.append("")
        out.append("```")

    return "\n".join(out).rstrip() + "\n"


def main():
    if len(sys.argv) < 3:
        print("usage: parse-junit.py <label> <glob> [<glob> ...]", file=sys.stderr)
        sys.exit(2)

    label = sys.argv[1]
    fails, skips = collect(sys.argv[2:])
    rendered = render(label, fails, skips, diag_dir=os.environ.get("DIAGNOSTICS_DIR"))

    print(rendered)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as fp:
            fp.write(rendered)
            fp.write("\n")


if __name__ == "__main__":
    main()
