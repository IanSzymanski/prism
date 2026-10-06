#!/usr/bin/env python3
"""Asset intake (0.15, F6): focal points, the crop markup, and the brand image library.
Usage: python3 tests/assets.test.py   (needs PIL, pandoc and node; no browser)"""
import json, os, shutil, subprocess, sys, tempfile
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit")
fails, n = [], 0


def check(name, ok, detail=""):
    global n
    n += 1
    if not ok: fails.append(f"{name}: {detail}")


tmp = tempfile.mkdtemp(prefix="prism-assets-")
try:
    # 1. images.py finds a subject off centre: a face-toned, detailed shape near the top right of a plain photo.
    src = os.path.join(tmp, "src"); os.makedirs(src)
    im = Image.new("RGB", (1600, 900), (200, 205, 210)); d = ImageDraw.Draw(im)
    d.ellipse((1180, 140, 1420, 420), fill=(214, 160, 130))
    for k in range(0, 240, 12): d.line((1180 + k, 140, 1180 + k, 420), fill=(150, 95, 70), width=3)
    im.save(os.path.join(src, "Person Right.jpg"))
    Image.new("RGB", (800, 800), (120, 130, 140)).save(os.path.join(src, "flat.jpg"))
    out = os.path.join(tmp, "proj", "images")
    r = subprocess.run([sys.executable, os.path.join(KIT, "images.py"), out, os.path.join(src, "Person Right.jpg"), os.path.join(src, "flat.jpg")], capture_output=True, text=True)
    check("images.py runs", r.returncode == 0, r.stderr)
    check("images.py prints a Focus column", "| Focus |" in r.stdout, r.stdout)
    focal = json.load(open(os.path.join(out, ".focus.json")))
    fx, fy = (int(v.rstrip("%")) for v in focal["person-right.jpg"].split())
    check("focus follows the subject to the right", fx >= 65, focal)
    check("focus follows the subject up", fy <= 45, focal)
    check("a featureless image stays centred", focal["flat.jpg"] == "50% 50%", focal)
    # A second run adds to the file rather than replacing it.
    subprocess.run([sys.executable, os.path.join(KIT, "images.py"), out, os.path.join(src, "flat.jpg")], capture_output=True, check=True)
    check("a later upload keeps earlier focal points", "person-right.jpg" in json.load(open(os.path.join(out, ".focus.json"))))

    # 2. The Lua filter turns focal points into object-position for every page-built format.
    proj = os.path.join(tmp, "proj")
    md = os.path.join(proj, "t.md")
    open(md, "w").write("![](images/person-right.jpg)\n\n![](images/person-right.jpg){focus=\"10% 20%\"}\n\n![](images/none.jpg)\n\n![](brand:team)\n\n![](prism:logo)\n")
    env = {**os.environ, "PRISM_LIBRARY_TEAM": "/lib/team.jpg", "PRISM_LIBRARY_TEAM_FOCUS": "40% 30%", "PRISM_ASSET_LOGO": "/brand/logo.png"}
    r = subprocess.run(["pandoc", md, "-t", "html", "--lua-filter", os.path.join(KIT, "prism-sheet.lua")], capture_output=True, text=True, env=env, cwd=tmp)
    check("pandoc with the filter runs", r.returncode == 0, r.stderr)
    h = r.stdout
    check("found focus passed to the page", f'data-focus="{fx}% {fy}%"' in h, h)
    check("written focus wins", 'data-focus="10% 20%"' in h and h.count("data-focus") == 3, h)
    check("no focus, no attribute", '<img src="images/none.jpg" />' in h, h)
    check("library photo resolves with its focus", 'src="file:///lib/team.jpg"' in h and 'data-focus="40% 30%"' in h, h)
    check("asset roles still resolve", 'src="file:///brand/logo.png"' in h, h)
    r = subprocess.run(["pandoc", "-t", "html", "--lua-filter", os.path.join(KIT, "prism-sheet.lua")], input="![](brand:missing)\n", capture_output=True, text=True, env=env)
    check("unknown library photo fails the build", r.returncode != 0 and "image library has no" in r.stderr, r.stderr)

    # 3. Crops centre on the focus as far as the image reaches; no focus overflow means centred.
    js = """const F = require(process.argv[1] + '/focus.js');
console.log(JSON.stringify([F.crop(2400, 1200, 1240, 1500, '80% 25%'), F.crop(2400, 1200, 500, 500, '100% 0%'), F.position(2400, 1200, 500, 500, '0% 50%'), F.position(2400, 1200, 1000, 500, '80% 25%'), F.position(1000, 1000, 300, 600, '50% 50%')]));"""
    r = subprocess.run(["node", "-e", js, KIT], capture_output=True, text=True)
    c = json.loads(r.stdout) if r.returncode == 0 else [None] * 5
    check("tall crop centres on a subject at 80%", c[0] == {"left": 1408, "top": 0, "width": 992, "height": 1200}, c[0])
    check("crop stops at the image edge", c[1] == {"left": 1200, "top": 0, "width": 1200, "height": 1200}, c[1])
    check("position at the left edge", c[2] == "0% 50%", c[2])
    check("same shape needs no crop", c[3] == "50% 50%", c[3])
    check("centred focus is the centred crop", c[4] == "50% 50%", c[4])

    # 4. The library resolves from the pinned snapshot, on a copy of the kit.
    kit = os.path.join(tmp, "kit")
    shutil.copytree(KIT, kit, ignore=shutil.ignore_patterns("mods", "cache", "node_modules", "env.sh", ".ready-*"))
    pf = os.path.join(kit, "brands", "case-amplify", "profile.json"); prof = json.load(open(pf))
    prof["library"]["images"] = {"team-card": {"file": "assets/Backgrounds/cta-card.png", "shows": "Card art", "people": "no", "orientation": "landscape", "focus": "30% 60%", "tags": ["test"]}}
    json.dump(prof, open(pf, "w"), indent=1)
    js = """const B = require(process.argv[1] + '/brand.js')(null, 'case-amplify');
const p = B.src('brand:team-card', '/');
let missing = ''; try { B.src('brand:nope', '/'); } catch (e) { missing = e.message; }
console.log(JSON.stringify({ p, focus: B.focus(p), written: B.focus(p, '5% 5%'), env: B.env().PRISM_LIBRARY_TEAM_CARD_FOCUS, missing }));"""
    r = subprocess.run(["node", "-e", js, kit], capture_output=True, text=True)
    check("brand.js loads a library", r.returncode == 0, r.stderr)
    if r.returncode == 0:
        o = json.loads(r.stdout)
        check("brand:<id> is the snapshot file", o["p"].endswith("snapshot/assets/Backgrounds/cta-card.png"), o)
        check("library focus", o["focus"] == "30% 60%" and o["written"] == "5% 5%" and o["env"] == "30% 60%", o)
        check("unknown id names the library command", "run.sh library" in o["missing"], o)
    r = subprocess.run(["node", os.path.join(kit, "library.js"), "case-amplify"], capture_output=True, text=True)
    check("library listing", r.returncode == 0 and "| brand:team-card | Card art |" in r.stdout, r.stdout + r.stderr)
    for bad, why in [({"file": "assets/Photos/not-there.jpg"}, "not in the pinned snapshot"), ({"file": "assets/Backgrounds/cta-card.png", "_id": "Bad Id"}, "lowercase")]:
        lid = bad.pop("_id", "x")
        prof["library"]["images"] = {lid: bad}; json.dump(prof, open(pf, "w"), indent=1)
        r = subprocess.run(["node", os.path.join(kit, "resolve.js"), "case-amplify", "--out", os.path.join(tmp, "res")], capture_output=True, text=True)
        check(f"library refuses: {why}", r.returncode == 1 and why in r.stderr, r.stderr)

    # 5. Shipped brands resolve with their (empty) libraries.
    for b in ["case-amplify", "prism"]:
        r = subprocess.run(["node", os.path.join(KIT, "library.js"), b], capture_output=True, text=True)
        check(f"{b} library lists", r.returncode == 0 and "image library" in r.stdout, r.stderr)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

for f in fails: print("FAIL", f)
print(f"{n - len(fails)}/{n} checks passed")
sys.exit(1 if fails else 0)
