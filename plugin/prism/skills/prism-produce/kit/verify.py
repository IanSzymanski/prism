#!/usr/bin/env python3
"""Confirms a deliverable was built by this kit in the brand fonts. Usage: verify.py [--brand ID] FILE_OR_FOLDER [...]
PDF: kit stamp in the file properties, and only the brand's fonts (plus Phosphor icons) embedded. PPTX: kit stamp, and only the brand's Office fonts.
Social, email or carousel folder: every PNG matches the fingerprint the build recorded.
Website page folder: the block markup, page.json and every photo to upload match the build's fingerprints.
HTML email folder: the tagged HTML, plain text, images zip and every image match the build's fingerprints.
Every kind: no photo in it carries GPS (location) data; the brand is the one the file records (--brand says which one it
should be); and when the piece's content.md has moved on from the version the file was built from, it fails: rebuild."""
import hashlib, json, os, re, sys, zipfile


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brandpath import brand_dir, default_brand, snapshot_dir
from photometa import gps_in, gps_in_image

KIT = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
EXPECT = args[args.index("--brand") + 1] if "--brand" in args else None
if "--brand" in args: i = args.index("--brand"); del args[i:i + 2]
if not args:
    print("usage: verify.py [--brand ID] FILE_OR_FOLDER [...]  (deliver only what it reports as OK)"); sys.exit(2)


def brand_fonts(bid):
    """The brand's families from its profile: font roles -> the design system's family stacks -> first family, as PDFs name it."""
    d = brand_dir(bid)
    prof = json.load(open(os.path.join(d, "profile.json")))
    fam = json.load(open(os.path.join(snapshot_dir(bid), "tokens.json")))["type"]["families"]
    first = lambda r: fam[prof["roles"][r]].split(",")[0].strip().strip("'\"").replace(" ", "")
    return {r: first(f"prism-font-{r}") for r in ("serif", "sans", "mono")}, set((prof.get("office") or {}).get("fonts", {}).values())


_fonts = {}
def fonts_of(bid):
    if bid not in _fonts: _fonts[bid] = brand_fonts(bid)
    return _fonts[bid]


def stamped(bid, version, path):
    """The brand to check against and the problems with what the file records: another brand than --brand asks for,
    or a content version content.md has since moved on from."""
    errs = []
    if EXPECT and bid and bid != EXPECT:
        errs.append(f"built in the {bid} brand, not {EXPECT}: put brand: {EXPECT} in content.md (or the format file) and rebuild")
    now = content_version(path)
    if version and now and str(version) != str(now):
        errs.append(f"built from content v{version}, but content.md is v{now} now: rebuild")
    return (bid or EXPECT or default_brand()), errs


def content_version(path):
    """The version in the content.md of the piece an output sits in (<piece>/out/...), or None."""
    d = os.path.abspath(path if os.path.isdir(path) else os.path.dirname(path))
    for _ in range(3):
        f = os.path.join(d, "content.md")
        if os.path.exists(f):
            m = re.search(r'^version:\s*["\']?v?(\d+)', open(f, encoding="utf8").read().split("\n---", 1)[0], re.M)
            return m.group(1) if m else None
        d = os.path.dirname(d)
    return None
GPS = "photo carries GPS location data (normalise it with run.sh images and rebuild)"
IMAGES = (".jpg", ".jpeg", ".png", ".webp", ".gif")


def pdf(path):
    s = open(path, "rb").read().decode("latin1")
    errs = []
    if "/Creator (Prism" not in s:
        errs.append("not built by the Prism kit (no kit stamp)")
    # The last Info object written is the kit's stamp: it must carry the title and author.
    at = s.rfind("/Creator (Prism")
    info = s[s.rfind(" obj", 0, at):s.find("endobj", at)] if at >= 0 else ""
    missing = [k for k in ("Title", "Author") if not re.search(rf"/{k}\s*[(<](?!\)|>)", info)]
    if missing: errs.append("PDF details missing: " + ", ".join(missing) + " (rebuild with this kit)")
    bm, cm = re.search(r"/PrismBrand\s*\(([\w-]+)\)", info), re.search(r"/PrismContent\s*\((\d+)\)", info)
    bid, more = stamped(bm and bm.group(1), cm and cm.group(1), path)
    errs += more
    FAMILIES = fonts_of(bid)[0]
    PDF_FONTS = tuple(FAMILIES.values()) + ("Phosphor",)
    fonts = {re.sub(r"^[A-Z]{6}\+", "", f) for f in re.findall(r"/FontName\s*/([^\s/<>\[\]()]+)", s)}
    other = sorted(f for f in fonts if not f.startswith(PDF_FONTS))
    if other: errs.append("non-brand fonts: " + ", ".join(other))
    if not any(f.startswith(FAMILIES["serif"]) for f in fonts) or not any(f.startswith(FAMILIES["sans"]) for f in fonts):
        errs.append(f"{FAMILIES['serif']} and {FAMILIES['sans']} are not both present")
    if gps_in(s.encode("latin1")): errs.append(GPS)
    return errs


def pptx(path):
    errs = []
    with zipfile.ZipFile(path) as z:
        core = z.read("docProps/core.xml").decode("utf8", "ignore")
        if not re.search(r">Prism \d", core):
            errs.append("not built by the Prism kit (no kit stamp)")
        bm, cm = re.search(r">Prism [^<]*· brand ([\w-]+)", core), re.search(r">Prism [^<]*· content v(\d+)", core)
        bid, more = stamped(bm and bm.group(1), cm and cm.group(1), path)
        errs += more
        DECK_FONTS = fonts_of(bid)[1]
        faces = set()
        for n in z.namelist():
            # Slides and charts are what people see; masters and themes keep PowerPoint's unused defaults.
            if re.match(r"ppt/(slides|charts)/[^/]+\.xml$", n):
                faces |= set(re.findall(r'typeface="([^"]+)"', z.read(n).decode("utf8", "ignore")))
        other = sorted(f for f in faces if f not in DECK_FONTS and not f.startswith("+"))
        if other: errs.append("non-brand fonts: " + ", ".join(other))
        located = [n.rsplit("/", 1)[-1] for n in z.namelist() if n.startswith("ppt/media/") and gps_in_image(z.read(n))]
        if located: errs.append(GPS + ": " + ", ".join(located))
    return errs


def folder(path):
    stamp = os.path.join(path, ".prism-build.json")
    if not os.path.exists(stamp):
        return ["not built by the Prism kit (no .prism-build.json)"]
    data = json.load(open(stamp))
    rec, errs = data["images"], []
    _, errs = stamped(data.get("brand"), data.get("content"), path)
    for f in sorted(x for x in os.listdir(path) if x.endswith(".png")):
        h = hashlib.sha256(open(os.path.join(path, f), "rb").read()).hexdigest()
        if rec.get(f) != h: errs.append(f"{f} was not made by this build")
    # Every image the build made is still there, and no other image sits beside them (C5).
    for f in sorted(rec):
        if not os.path.exists(os.path.join(path, f)): errs.append(f"{f} is missing")
    known = set(rec) | set(data.get("files") or {})
    for f in sorted(x for x in os.listdir(path) if x.lower().endswith(IMAGES) and not x.endswith(".png") and x not in known):
        errs.append(f"{f} was not made by this build")
    # HTML email: the HTML, plain text, zip and every image are fingerprinted, so a hand edit shows up here.
    for f, want in (data.get("files") or {}).items():
        p = os.path.join(path, f)
        if not os.path.exists(p): errs.append(f"{f} is missing")
        elif hashlib.sha256(open(p, "rb").read()).hexdigest() != want: errs.append(f"{f} was changed after the build")
    located = sorted(os.path.relpath(os.path.join(d, f), path) for d, _, fs in os.walk(path) for f in fs
                     if f.lower().endswith(IMAGES) and gps_in_image(open(os.path.join(d, f), "rb").read()))
    if located: errs.append(GPS + ": " + ", ".join(located))
    main = data.get("main", "email.html")
    if data.get("format") in ("html-email", "illustration", "web") and not os.path.exists(os.path.join(path, main)):
        errs.append(f"{main} is missing")
    return errs


bad = 0
for p in args:
    kind = "folder" if os.path.isdir(p) else p.lower().rsplit(".", 1)[-1]
    check = {"pdf": pdf, "pptx": pptx, "folder": folder}.get(kind)
    errs = check(p) if check else [f"can't verify .{kind} files"]
    print(("FAIL " if errs else "OK   ") + p + ("" if not errs else ": " + "; ".join(errs)))
    bad += bool(errs)
sys.exit(1 if bad else 0)
