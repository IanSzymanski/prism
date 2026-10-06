#!/usr/bin/env python3
"""Adds an onboarding bundle (onboard.js bundle) to the kit's shipped brands, then pins it and runs the brand tests.
Usage: python3 tools/add-brand.py BUNDLE.zip [--replace]
--replace swaps out a shipped brand of the same id (a re-run after its design system changed); it keeps that brand's "default".
The bundle's ONBOARDING notes go to dist/ (not shipped): read them, and the code they list, before committing."""
import json, os, shutil, subprocess, sys, tempfile, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDS = os.path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit", "brands")
args = [a for a in sys.argv[1:] if not a.startswith("--")]
if len(args) != 1: sys.exit(__doc__)
z = zipfile.ZipFile(args[0])
names = z.namelist()
# Only plain relative paths: a bundle never writes outside its own folder.
bad = [n for n in names if n.startswith("/") or ".." in n.split("/")]
if bad: sys.exit(f"[add-brand] unsafe paths in the bundle: {bad[:3]}")
tops = {n.split("/")[0] for n in names if "/" in n}
notes = [n for n in names if "/" not in n and n.startswith("ONBOARDING-")]
if len(tops) != 1 or len(notes) != 1 or f"{next(iter(tops))}/profile.json" not in names:
    sys.exit("[add-brand] not an onboarding bundle: expected one brand folder with profile.json and one ONBOARDING-<id>.md")
bid = next(iter(tops))
dest = os.path.join(BRANDS, bid)
was_default = False
if os.path.exists(dest):
    if "--replace" not in sys.argv: sys.exit(f"[add-brand] {bid} is already shipped; pass --replace to swap it for this bundle")
    was_default = json.load(open(os.path.join(dest, "profile.json"))).get("default") is True
with tempfile.TemporaryDirectory() as t:
    z.extractall(t)
    if os.path.exists(dest): shutil.rmtree(dest)
    shutil.copytree(os.path.join(t, bid), dest)
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    shutil.copy(os.path.join(t, notes[0]), os.path.join(ROOT, "dist", notes[0]))
if was_default:
    p = os.path.join(dest, "profile.json"); prof = json.load(open(p)); prof["default"] = True
    open(p, "w").write(json.dumps(prof, indent=1, ensure_ascii=False) + "\n")
print(f"[add-brand] {bid} -> {os.path.relpath(dest, ROOT)}{' (kept as the default brand)' if was_default else ''}; notes in dist/{notes[0]}")
ok = True
for cmd in (["node", "tools/pin-profile.js", bid], ["node", "tests/brands.test.js"], ["node", "tests/resolve.test.js"], ["python3", "tests/core-brand-free.test.py"]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env={**os.environ, "PRISM_DRAFTS": "/nonexistent"})
    last = (r.stdout.strip().splitlines() or [""])[-1]
    print(f"  {'ok  ' if r.returncode == 0 else 'FAIL'} {' '.join(cmd)}: {last}")
    if r.returncode: ok = False; print("\n".join("    " + l for l in (r.stdout + r.stderr).strip().splitlines()[-15:]))
print("[add-brand] next: build the swatch (run.sh swatch " + bid + " out/" + bid + "-swatch.pdf), read the notes and any listed code, then commit." if ok else "[add-brand] fix the failures above before committing")
sys.exit(0 if ok else 1)
