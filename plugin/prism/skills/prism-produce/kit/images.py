#!/usr/bin/env python3
"""Normalises uploaded images into a project's images/ folder and prints an inventory table.
Usage: images.py OUT_DIR IMAGE [IMAGE...]
Fixes phone rotation, converts to RGB, caps the long edge at 4000px, keeps PNG only when transparency matters."""
import os, sys
from PIL import Image, ImageOps

def slug(name):
    base = os.path.splitext(os.path.basename(name))[0].lower()
    return "".join(c if c.isalnum() else "-" for c in base).strip("-") or "image"

def main():
    out_dir, files = sys.argv[1], sys.argv[2:]
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for f in files:
        try:
            im = Image.open(f)
            im = ImageOps.exif_transpose(im)
        except Exception as e:
            rows.append(f"| {os.path.basename(f)} | could not open ({e.__class__.__name__}); ask for JPG or PNG | | | | |")
            continue
        alpha = im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info)
        im = im.convert("RGBA" if alpha else "RGB")
        if max(im.size) > 4000:
            im.thumbnail((4000, 4000), Image.LANCZOS)
        w, h = im.size
        r = w / h
        orient = "landscape" if r > 1.15 else "portrait" if r < 0.87 else "square"
        name = slug(f) + (".png" if alpha else ".jpg")
        dest = os.path.join(out_dir, name)
        n = 2
        while os.path.exists(dest):
            dest = os.path.join(out_dir, f"{slug(f)}-{n}{'.png' if alpha else '.jpg'}"); n += 1
        if alpha: im.save(dest, optimize=True)
        else: im.save(dest, quality=90, optimize=True)
        # Widest it can print sharply: 200 dpi is good, 150 dpi is the floor.
        good, floor = w / 200, w / 150
        if good >= 6.5 and orient == "landscape": use = "hero, full width, anything"
        elif good >= 3: use = "media row, figure, gallery"
        elif floor >= 2: use = "gallery or social only"
        else: use = "too small for print; social only"
        rows.append(f"| {os.path.relpath(dest)} | {w}×{h} | {orient} | {good:.1f} in | {floor:.1f} in | {use} |")
    print("| File | Pixels | Orientation | Sharp up to (200 dpi) | Floor (150 dpi) | Print fit |")
    print("|---|---|---|---|---|---|")
    print("\n".join(rows))

main()
