#!/usr/bin/env python3
"""Builds the Prism plugin zip (dist/prism-VERSION.zip) and stamps VERSION everywhere.
Usage: build.py VERSION   (never pass --help: the first argument is the version)"""
import json, os, re, subprocess, sys

VER = sys.argv[1]
# Paths default to this repository's layout; override with PRISM_SRC and PRISM_DIST.
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get("PRISM_SRC", os.path.join(ROOT, "plugin", "prism"))
DIST = os.environ.get("PRISM_DIST", os.path.join(ROOT, "dist"))
JUNK = ["__pycache__", "node_modules", "mods", "cache", "env.sh", ".ready-sheet", ".ready-deck", ".setup.lock"]


def sub(p, pat, rep):
    s = open(p).read()
    s2, n = re.subn(pat, rep, s)
    assert n, (p, pat[:70])
    open(p, "w").write(s2)


# The tutorial must describe this release before anything is built (tools/check-tutorial.py says what is out of date).
chk = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "check-tutorial.py"), VER], capture_output=True, text=True, env={**os.environ, "PRISM_PLUGIN": SRC})
if chk.returncode: sys.exit(chk.stdout + "Update skills/prism-draft/references/tutorial.md (and tools/check-tutorial.py for a new format, skill or brand), then build again.")

for p in ["skills/prism-draft/SKILL.md", "skills/prism-produce/SKILL.md", "skills/prism-quick/SKILL.md", "skills/prism-onboard/SKILL.md"]:
    sub(f"{SRC}/{p}", r'version: "[^"]+"', f'version: "{VER}"')
m = json.load(open(f"{SRC}/.claude-plugin/plugin.json")); m["version"] = VER
json.dump(m, open(f"{SRC}/.claude-plugin/plugin.json", "w"), indent=2)
open(f"{SRC}/skills/prism-produce/kit/VERSION", "w").write(VER + "\n")

z = f"{DIST}/prism-{VER}.zip"
if os.path.exists(z): os.remove(z)
os.makedirs(DIST, exist_ok=True)  # a fresh clone has no dist/
ex = sum([["-x", f"*/{j}/*", "-x", f"*/{j}"] for j in JUNK], [])
subprocess.run(["zip", "-qr", z, os.path.basename(SRC)] + ex, check=True, cwd=os.path.dirname(SRC))
print("built", VER)
