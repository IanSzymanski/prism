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
    check("unknown library photo fails the build", r.returncode != 0 and "not fetched yet" in r.stderr, r.stderr)

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

    # 4. Library photos stay in the design system: a release pins their upload ids, a piece fetches the ones it uses.
    kit = os.path.join(tmp, "kit")
    shutil.copytree(KIT, kit, ignore=shutil.ignore_patterns("mods", "cache", "node_modules", "env.sh", ".ready-*"))
    cache, drafts = os.path.join(tmp, "library-cache"), os.path.join(tmp, "drafts")
    lenv = {**os.environ, "PRISM_LIBRARY_CACHE": cache, "PRISM_DRAFTS": drafts}
    brand = os.path.join(kit, "brands", "case-amplify")
    pf = os.path.join(brand, "profile.json"); prof = json.load(open(pf))
    photo = "assets/Backgrounds/cta-card.png"
    blob = prof["snapshot"]["blobs"][photo]
    prof["library"]["images"] = {"team-card": {"file": photo, "shows": "Card art", "people": "no", "orientation": "landscape", "focus": "30% 60%", "tags": ["test"]}}
    json.dump(prof, open(pf, "w"), indent=1)
    lib = lambda *a: subprocess.run(["node", os.path.join(kit, "library.js"), "case-amplify", *a], capture_output=True, text=True, env=lenv)
    js = """const B = require(process.argv[1] + '/brand.js')(null, 'case-amplify');
let p = '', missing = '', unfetched = '';
try { p = B.src('brand:team-card', '/'); } catch (e) { unfetched = e.message; }
try { B.src('brand:nope', '/'); } catch (e) { missing = e.message; }
console.log(JSON.stringify({ p, focus: p && B.focus(p), written: p && B.focus(p, '5% 5%'), env: B.env().PRISM_LIBRARY_TEAM_CARD_FOCUS || null, missing, unfetched }));"""
    brandjs = lambda: subprocess.run(["node", "-e", js, kit], capture_output=True, text=True, env=lenv)
    r = brandjs()
    check("brand.js loads a library", r.returncode == 0, r.stderr)
    if r.returncode == 0:
        o = json.loads(r.stdout)
        check("an unfetched photo stops the build with the fetch command", not o["p"] and "not fetched yet" in o["unfetched"] and "--need" in o["unfetched"], o)
        check("an unfetched photo gets no Lua variable", o["env"] is None, o)
        check("unknown id names the library command", "run.sh library" in o["missing"], o)
    r = lib()
    check("library listing", r.returncode == 0 and "| brand:team-card | Card art |" in r.stdout, r.stdout + r.stderr)
    piece = os.path.join(tmp, "piece", "formats"); os.makedirs(piece)
    open(os.path.join(piece, "sheet.md"), "w").write("![Our card](brand:team-card)\n\n![](images/x.jpg)\n")
    r = lib("--need", piece)
    check("--need lists the upload id of each photo used", r.returncode == 0 and r.stdout.splitlines()[1:2] == [blob] and len(r.stdout.splitlines()) == 3 and "--take" in r.stdout, r.stdout + r.stderr)
    open(os.path.join(piece, "deck.md"), "w").write("![](brand:nobody)\n")
    r = lib("--need", piece)
    check("--need refuses an unknown photo", r.returncode == 1 and '"nobody"' in r.stderr, r.stderr)
    os.remove(os.path.join(piece, "deck.md"))

    # A read by upload id saves <id>.<ext>; a read by design-system path saves project/assets/<group>/<file> beside the index.
    def read(name, blob_id=blob, index=True, by_id=False, photo_bytes=None):
        d = os.path.join(tmp, name, "project"); os.makedirs(os.path.join(d, "assets", "Backgrounds"))
        idx = json.load(open(os.path.join(brand, "snapshot", "design-system.json")))
        idx["assetGroups"]["Backgrounds"]["files"]["cta-card.png"]["blob"] = blob_id
        if index: json.dump(idx, open(os.path.join(d, "design-system.json"), "w"))
        dest = os.path.join(os.path.dirname(d), blob + ".png") if by_id else os.path.join(d, photo)
        if photo_bytes is None: shutil.copy(os.path.join(brand, "snapshot", photo), dest)
        else: open(dest, "wb").write(photo_bytes)
        return os.path.dirname(d)
    r = lib("--take", read("no-index", index=False))
    check("--take by path needs the index to check the upload", r.returncode == 1 and "design-system.json" in r.stderr and blob in r.stderr, r.stderr)
    r = lib("--take", read("replaced", blob_id="0" * 32))
    check("--take refuses a photo replaced since the release", r.returncode == 1 and "replaced" in r.stderr and not os.path.exists(cache), r.stderr)
    r = lib("--take", read("empty", by_id=True, photo_bytes=b""))
    check("--take refuses an empty download", r.returncode == 1 and "is empty" in r.stderr, r.stderr)
    r = lib("--take", read("by-path"))
    check("--take keeps a pinned upload read by path", r.returncode == 0 and "brand:team-card: fetched" in r.stdout, r.stdout + r.stderr)
    shutil.rmtree(cache)
    r = lib("--take", read("by-id", index=False, by_id=True))
    check("--take keeps a photo read by upload id, no index needed", r.returncode == 0 and "brand:team-card: fetched" in r.stdout, r.stdout + r.stderr)
    r = brandjs()
    if r.returncode == 0:
        o = json.loads(r.stdout)
        check("brand:<id> is the fetched photo, by upload id", o["p"] == os.path.join(cache, "case-amplify", blob, "cta-card.png"), o)
        check("library focus", o["focus"] == "30% 60%" and o["written"] == "5% 5%" and o["env"] == "30% 60%", o)
    else: check("brand.js after fetching", False, r.stderr)
    r = lib("--need", piece)
    check("--need after fetching", r.returncode == 0 and "are fetched" in r.stdout, r.stdout)
    r = subprocess.run(["node", os.path.join(kit, "resolve.js"), "case-amplify", "--out", os.path.join(tmp, "res"), "--live", read("live-replaced", blob_id="1" * 32)], capture_output=True, text=True, env=lenv)
    check("a replaced library photo is drift", r.returncode == 0 and "library photo team-card" in r.stderr, r.stderr)
    for bad, why in [({"file": "assets/Photos/not-there.jpg"}, "not in the design system this release pinned"), ({"file": photo, "_id": "Bad Id"}, "lowercase")]:
        lid = bad.pop("_id", "x")
        prof["library"]["images"] = {lid: bad}; json.dump(prof, open(pf, "w"), indent=1)
        r = subprocess.run(["node", os.path.join(kit, "resolve.js"), "case-amplify", "--out", os.path.join(tmp, "res")], capture_output=True, text=True, env=lenv)
        check(f"library refuses: {why}", r.returncode == 1 and why in r.stderr, r.stderr)
    prof["library"]["images"] = {}; json.dump(prof, open(pf, "w"), indent=1)

    # Onboarding records a library photo by upload id and never copies it into the snapshot.
    ob = lambda *a: subprocess.run(["node", os.path.join(kit, "onboard.js"), *a], capture_output=True, text=True, env=lenv)
    r = ob("update", "case-amplify")
    check("draft for the library", r.returncode == 0, r.stderr)
    snap_before = json.load(open(os.path.join(drafts, "case-amplify", "profile.json")))["snapshot"]["files"]
    shutil.rmtree(cache, ignore_errors=True)
    r = ob("library", "case-amplify", "team-card", "--file", photo, "--photo", os.path.join(brand, "snapshot", photo), "--shows", "Card art", "--people", "no", "--tags", "card, test")
    check("onboard library records a photo", r.returncode == 0 and "not bundled" in r.stdout, r.stdout + r.stderr)
    dp = json.load(open(os.path.join(drafts, "case-amplify", "profile.json")))
    e = dp["library"]["images"].get("team-card", {})
    check("orientation and focus come from the photo", e.get("orientation") in ("landscape", "portrait", "square") and e.get("focus", "").endswith("%") and e.get("tags") == ["card", "test"], e)
    check("the snapshot does not grow", dp["snapshot"]["files"] == snap_before, set(dp["snapshot"]["files"]) ^ set(snap_before))
    check("the photo read at onboarding counts as fetched", os.path.exists(os.path.join(cache, "case-amplify", blob, "cta-card.png")))
    r = ob("library", "case-amplify", "ghost", "--file", "assets/Photos/ghost.jpg")
    check("onboard library refuses a file the design system lacks", r.returncode == 1 and "not in the design system" in r.stderr, r.stderr)
    r = ob("library", "case-amplify", "bare", "--file", photo)
    check("no photo read: says what is unset", r.returncode == 0 and "Who is in it?" in r.stdout and "--photo" in r.stdout, r.stdout + r.stderr)
    r = ob("library", "case-amplify", "bare", "--remove")
    check("onboard library --remove", r.returncode == 0 and "bare" not in json.load(open(os.path.join(drafts, "case-amplify", "profile.json")))["library"]["images"], r.stderr)

    # The design-system reader: upload ids to read in one call (never the photo library), then each put where the index names it.
    dsr = os.path.join(tmp, "ds-read"); os.makedirs(os.path.join(dsr, "project"))
    idx = json.load(open(os.path.join(KIT, "brands", "prism", "snapshot", "design-system.json")))
    idx["assetGroups"]["Photos"] = {"name": "Photos", "files": {"team.jpg": {"name": "team.jpg", "blob": "f" * 32, "size": 4000000, "type": "image/jpeg"}}}
    json.dump(idx, open(os.path.join(dsr, "project", "design-system.json"), "w"))
    ids = [r["blob"] for g, v in idx["assetGroups"].items() if g != "Photos" for r in v["files"].values()]
    r = subprocess.run(["node", os.path.join(KIT, "ds.js"), "assets", dsr, "--brand", "prism"], capture_output=True, text=True)
    out = r.stdout.splitlines()
    check("ds assets lists every upload but the photo library", r.returncode == 0 and out[1:] == ids and "f" * 32 not in out and '"Photos" stay' in out[0], r.stdout + r.stderr)
    r = subprocess.run(["node", os.path.join(KIT, "ds.js"), "assets", dsr, "--all"], capture_output=True, text=True)
    check("ds assets --all includes the photos", "f" * 32 in r.stdout, r.stdout)
    logo = idx["assetGroups"]["Logos"]["files"]["prism-logo.svg"]["blob"]
    open(os.path.join(dsr, logo + ".svg"), "w").write("<svg/>")
    r = subprocess.run(["node", os.path.join(KIT, "ds.js"), "place", dsr], capture_output=True, text=True)
    check("ds place puts an upload at its design-system path", r.returncode == 0 and open(os.path.join(dsr, "project", "assets", "Logos", "prism-logo.svg")).read() == "<svg/>" and "not read" in r.stdout and "Photos" in r.stdout, r.stdout + r.stderr)

    # 5. Shipped brands resolve with their (empty) libraries.
    for b in ["case-amplify", "prism"]:
        r = subprocess.run(["node", os.path.join(KIT, "library.js"), b], capture_output=True, text=True)
        check(f"{b} library lists", r.returncode == 0 and "image library" in r.stdout, r.stderr)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

for f in fails: print("FAIL", f)
print(f"{n - len(fails)}/{n} checks passed")
sys.exit(1 if fails else 0)
