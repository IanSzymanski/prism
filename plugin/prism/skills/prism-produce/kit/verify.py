#!/usr/bin/env python3
"""Confirms a deliverable was built by this kit in the brand fonts. Usage: verify.py [--brand ID] FILE_OR_FOLDER [...]
PDF: kit stamp in the file properties, and only the brand's fonts (plus Phosphor icons) embedded. PPTX: kit stamp, and only the brand's Office fonts.
Social, email or carousel folder: every PNG matches the fingerprint the build recorded.
HTML email folder: the tagged HTML, plain text, images zip and every image match the build's fingerprints."""
import hashlib, json, os, re, sys, zipfile


def default_brand():
    """The profile marked "default": true in kit/brands (or the only brand installed)."""
    import json as _j
    d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "brands")
    ids = sorted(b for b in os.listdir(d) if os.path.exists(os.path.join(d, b, "profile.json")))
    marked = [b for b in ids if _j.load(open(os.path.join(d, b, "profile.json"))).get("default") is True]
    if len(marked) == 1: return marked[0]
    if not marked and len(ids) == 1: return ids[0]
    sys.exit("no single brand is marked \"default\": true in kit/brands; pass the brand")

KIT = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
BRAND = args[args.index("--brand") + 1] if "--brand" in args else default_brand()
if "--brand" in args: i = args.index("--brand"); del args[i:i + 2]


def brand_fonts(bid):
    """The brand's families from its profile: font roles -> the design system's family stacks -> first family, as PDFs name it."""
    d = os.path.join(KIT, "brands", bid)
    prof = json.load(open(os.path.join(d, "profile.json")))
    fam = json.load(open(os.path.join(d, "snapshot", "tokens.json")))["type"]["families"]
    first = lambda r: fam[prof["roles"][r]].split(",")[0].strip().strip("'\"").replace(" ", "")
    return {r: first(f"prism-font-{r}") for r in ("serif", "sans", "mono")}, set((prof.get("office") or {}).get("fonts", {}).values())


FAMILIES, DECK_FONTS = brand_fonts(BRAND)
PDF_FONTS = tuple(FAMILIES.values()) + ("Phosphor",)


def pdf(path):
    s = open(path, "rb").read().decode("latin1")
    errs = []
    if "/Creator (Prism" not in s:
        errs.append("not built by the Prism kit (no kit stamp)")
    fonts = {re.sub(r"^[A-Z]{6}\+", "", f) for f in re.findall(r"/FontName\s*/([^\s/<>\[\]()]+)", s)}
    other = sorted(f for f in fonts if not f.startswith(PDF_FONTS))
    if other: errs.append("non-brand fonts: " + ", ".join(other))
    if not any(f.startswith(FAMILIES["serif"]) for f in fonts) or not any(f.startswith(FAMILIES["sans"]) for f in fonts):
        errs.append(f"{FAMILIES['serif']} and {FAMILIES['sans']} are not both present")
    return errs


def pptx(path):
    errs = []
    with zipfile.ZipFile(path) as z:
        core = z.read("docProps/core.xml").decode("utf8", "ignore")
        if not re.search(r">Prism \d", core):
            errs.append("not built by the Prism kit (no kit stamp)")
        faces = set()
        for n in z.namelist():
            # Slides and charts are what people see; masters and themes keep PowerPoint's unused defaults.
            if re.match(r"ppt/(slides|charts)/[^/]+\.xml$", n):
                faces |= set(re.findall(r'typeface="([^"]+)"', z.read(n).decode("utf8", "ignore")))
        other = sorted(f for f in faces if f not in DECK_FONTS and not f.startswith("+"))
        if other: errs.append("non-brand fonts: " + ", ".join(other))
    return errs


def folder(path):
    stamp = os.path.join(path, ".prism-build.json")
    if not os.path.exists(stamp):
        return ["not built by the Prism kit (no .prism-build.json)"]
    data = json.load(open(stamp))
    rec, errs = data["images"], []
    for f in sorted(x for x in os.listdir(path) if x.endswith(".png")):
        h = hashlib.sha256(open(os.path.join(path, f), "rb").read()).hexdigest()
        if rec.get(f) != h: errs.append(f"{f} was not made by this build")
    # HTML email: the HTML, plain text, zip and every image are fingerprinted, so a hand edit shows up here.
    for f, want in (data.get("files") or {}).items():
        p = os.path.join(path, f)
        if not os.path.exists(p): errs.append(f"{f} is missing")
        elif hashlib.sha256(open(p, "rb").read()).hexdigest() != want: errs.append(f"{f} was changed after the build")
    main = data.get("main", "email.html")
    if data.get("format") == "html-email" and not os.path.exists(os.path.join(path, main)):
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
