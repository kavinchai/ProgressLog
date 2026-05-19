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
    files = []
    for g in globs:
        files.extend(glob.glob(g, recursive=True))
    fails = []
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
    return fails


def render(label, fails):
    out = [f"## {label}"]
    if not fails:
        out.append("")
        out.append("No failing tests recorded in JUnit XML.")
        return "\n".join(out) + "\n"

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
    return "\n".join(out).rstrip() + "\n"


def main():
    if len(sys.argv) < 3:
        print("usage: parse-junit.py <label> <glob> [<glob> ...]", file=sys.stderr)
        sys.exit(2)

    label = sys.argv[1]
    fails = collect(sys.argv[2:])
    rendered = render(label, fails)

    print(rendered)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as fp:
            fp.write(rendered)
            fp.write("\n")


if __name__ == "__main__":
    main()
