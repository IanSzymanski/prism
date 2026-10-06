#!/usr/bin/env python3
"""Compares two build trees as a reader would see them: PDF pages and PNGs pixel by pixel, PPTX slide XML and media,
text outputs line by line. Usage: diff-builds.py BEFORE AFTER [--rename OLD=NEW ...] (renames apply to text and file names)."""
import sys, os, io, zipfile, re, difflib
import pymupdf as fitz
from PIL import Image, ImageChops

a, b = sys.argv[1], sys.argv[2]
ren = [r.split("=", 1) for r in sys.argv[3:] if "=" in r]
def norm(s):
    for o, n in ren: s = s.replace(o, n)
    return s
def files(root):
    out = {}
    for d, _, fs in os.walk(root):
        for f in fs:
            p = os.path.join(d, f); out[norm(os.path.relpath(p, root))] = p
    return out
A, B = files(a), files(b)
bad = 0
def report(ok, name, msg=""):
    global bad
    if not ok: bad += 1
    print(("same   " if ok else "DIFF   ") + name + (f"  {msg}" if msg else ""))
def img_diff(x, y):
    if x.size != y.size: return f"size {x.size} vs {y.size}"
    d = ImageChops.difference(x.convert("RGB"), y.convert("RGB"))
    box = d.getbbox()
    if not box: return None
    px = sum(1 for p in d.getdata() if max(p) > 8)
    return f"{px} px differ (>8/255), max {max(max(p) for p in d.getdata())}, in {box}" if px else None
STAMP = re.compile(r"(?:Case Amplify Content Studio|Content Studio|Prism) [0-9][^<\"\n)]*|ca-kit|prism-kit|\d{4}-\d\d-\d\dT[\d:.]+Z?")
PATHS = re.compile(r'descr="/[^"]*"')  # absolute paths in image alt text (0.13.1 bug), compared separately
for k in sorted(set(A) | set(B)):
    if k not in A: report(False, k, "only in AFTER"); continue
    if k not in B: report(False, k, "only in BEFORE"); continue
    x, y = A[k], B[k]
    ext = os.path.splitext(k)[1].lower()
    if os.path.basename(k).endswith("build.json") or ext == ".zip": continue
    if ext == ".pdf":
        dx, dy = fitz.open(x), fitz.open(y)
        if len(dx) != len(dy): report(False, k, f"{len(dx)} vs {len(dy)} pages"); continue
        msgs = []
        for i in range(len(dx)):
            ix = Image.open(io.BytesIO(dx[i].get_pixmap(dpi=110).tobytes("png"))); iy = Image.open(io.BytesIO(dy[i].get_pixmap(dpi=110).tobytes("png")))
            m = img_diff(ix, iy)
            if m: msgs.append(f"p{i+1}: {m}")
            if norm(dx[i].get_text()) != dy[i].get_text(): msgs.append(f"p{i+1}: text differs")
        fx = sorted({f[3] for p in dx for f in p.get_fonts()}); fy = sorted({f[3] for p in dy for f in p.get_fonts()})
        if [re.sub(r"^[A-Z]{6}\+", "", f) for f in fx] != [re.sub(r"^[A-Z]{6}\+", "", f) for f in fy]: msgs.append(f"fonts {fx} vs {fy}")
        report(not msgs, k, "; ".join(msgs))
    elif ext == ".png" or ext == ".jpg":
        m = img_diff(Image.open(x), Image.open(y)); report(not m, k, m or "")
    elif ext == ".pptx":
        zx, zy = zipfile.ZipFile(x), zipfile.ZipFile(y); msgs = []
        nx, ny = sorted(norm(n) for n in zx.namelist()), sorted(zy.namelist())
        if nx != ny: msgs.append(f"parts differ: {sorted(set(nx) ^ set(ny))[:6]}")
        for n in zx.namelist():
            if norm(n) not in zy.namelist() or n.startswith("docProps/"): continue
            bx, by = zx.read(n), zy.read(norm(n))
            if n.endswith((".xml", ".rels")):
                sx, sy = STAMP.sub("", norm(bx.decode("utf8"))), STAMP.sub("", by.decode("utf8"))
                if PATHS.sub("", sx) != PATHS.sub("", sy): msgs.append(f"{n} differs")
                elif re.findall(r'descr="([^"]*)"', sy) != [d for d in re.findall(r'descr="([^"]*)"', sx)]:
                    alts = sorted(set(re.findall(r'descr="([^"]*)"', sy)) - set(re.findall(r'descr="([^"]*)"', sx)))
                    if any(not a.startswith("/") for a in alts): print(f"note   {k} {n}: alt text now {alts[:3]}")
            elif n.endswith(".xlsx"):
                ix, iy = zipfile.ZipFile(io.BytesIO(bx)), zipfile.ZipFile(io.BytesIO(by))
                if any(ix.read(m) != iy.read(m) for m in ix.namelist() if not m.startswith("docProps/")) or sorted(ix.namelist()) != sorted(iy.namelist()): msgs.append(f"{n} data differs")
            elif n.endswith((".png", ".jpg", ".jpeg")):
                m = img_diff(Image.open(io.BytesIO(bx)), Image.open(io.BytesIO(by)))
                if m: msgs.append(f"{n}: {m}")
            elif bx != by: msgs.append(f"{n} bytes differ")
        report(not msgs, k, "; ".join(msgs[:8]) + (f" (+{len(msgs)-8})" if len(msgs) > 8 else ""))
    else:
        try: tx, ty = norm(open(x, encoding="utf8").read()), open(y, encoding="utf8").read()
        except UnicodeDecodeError: report(open(x, "rb").read() == open(y, "rb").read(), k); continue
        tx, ty = STAMP.sub("", tx), STAMP.sub("", ty)
        if tx == ty: report(True, k)
        else:
            d = [l for l in difflib.unified_diff(tx.splitlines(), ty.splitlines(), lineterm="", n=0) if l[:1] in "+-" and l[:3] not in ("+++", "---")]
            report(False, k, f"{len(d)} lines: " + " | ".join(l[:110] for l in d[:4]))
print(f"\n{bad} difference(s)"); sys.exit(1 if bad else 0)
