"""Real-browser check of the audio runtime and every audio file (headless Chromium via Playwright).

    python tools/audio/browser_check.py

Serves the repo root, opens tools/audio/browser_test.html, decodes every manifest file with the
browser's own decoder (durations must match the manifest), then drives audio.js: unlock, sfx, music
streaming and buffer hand-over, pushMusic/popMusic, a jingle, ambience; meters the real output.
Fails on any console error. Writes tools/audio/out/browser_check.json.
"""
from __future__ import annotations

import json
import sys
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    from playwright.sync_api import sync_playwright

    srv = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(REPO)))
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    errors = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(headless=True, args=["--autoplay-policy=no-user-gesture-required"])
            page = b.new_page()
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{port}/next/tools/audio/browser_test.html", timeout=30000)
            page.wait_for_function("typeof window.audioCheck === 'function'", timeout=30000)
            res = page.evaluate("window.audioCheck()")
            b.close()
    finally:
        srv.shutdown()
    res["consoleErrors"] = errors
    out = HERE / "out" / "browser_check.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(res, indent=1), encoding="utf-8")
    bad = []
    for k, d in res["decode"].items():
        if d["manifest"] is not None and abs(d["duration"] - d["manifest"]) > 0.08:
            bad.append(f"{k}: browser {d['duration']} s vs manifest {d['manifest']} s")
    for s in res["steps"]:
        print(" ", s)
    print(f"  decoded {len(res['decode'])} files in Chromium; decode errors {len(res['errors'])}; duration mismatches {len(bad)}")
    for k in list(res["decode"])[:0]:
        pass
    jl = {k: v["leadMs"] for k, v in res["decode"].items() if k.startswith("jingles:")}
    print("  jingle leading silence (ms):", jl)
    for x in bad + res["errors"] + errors:
        print("  PROBLEM:", x)
    sys.exit(1 if (bad or res["errors"] or errors) else 0)


if __name__ == "__main__":
    main()
