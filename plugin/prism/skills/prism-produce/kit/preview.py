#!/usr/bin/env python3
"""Contact sheet of built outputs (PDF pages, PPTX slides, PNGs) for visual checks. Usage: preview.py out.png file [file...]"""
import os, subprocess, sys, tempfile, glob
from PIL import Image

def pages(path, tmp):
    ext = path.lower().rsplit(".", 1)[-1]
    if ext == "pptx":
        subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", tmp, path], capture_output=True, timeout=240)
        path = os.path.join(tmp, os.path.basename(path)[:-5] + ".pdf"); ext = "pdf"
    if ext == "pdf":
        stem = os.path.join(tmp, os.path.basename(path)[:-4])
        try:
            subprocess.run(["pdftoppm", "-r", "50", "-png", path, stem], check=True)
        except FileNotFoundError:
            # No poppler (e.g. ChatGPT): render with PyMuPDF instead.
            import pymupdf
            for n, pg in enumerate(pymupdf.open(path), 1): pg.get_pixmap(dpi=50).save(f"{stem}-{n:02d}.png")
        return sorted(glob.glob(stem + "-*.png"))
    return [path]

def main():
    out, files = sys.argv[1], sys.argv[2:]
    tmp = tempfile.mkdtemp()
    ims = [Image.open(p).convert("RGB") for f in files for p in pages(f, tmp)]
    if not ims: sys.exit("nothing to preview")
    cell = 420
    ims = [im.resize((cell, max(1, int(im.height * cell / im.width)))) for im in ims]
    cols = 3 if len(ims) > 4 else len(ims)
    rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
    H = sum(max(i.height for i in r) + 12 for r in rows)
    sheet = Image.new("RGB", (cols * (cell + 12), H), "#9a9a9a")
    y = 0
    for r in rows:
        for c, im in enumerate(r): sheet.paste(im, (c * (cell + 12), y))
        y += max(i.height for i in r) + 12
    sheet.save(out); print(f"wrote {out} ({len(ims)} pages)")

main()
