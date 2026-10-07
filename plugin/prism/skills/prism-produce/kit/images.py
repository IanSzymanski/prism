#!/usr/bin/env python3
"""Normalises uploaded images into a project's images/ folder and prints an inventory table.
Usage: images.py OUT_DIR IMAGE [IMAGE...]
Fixes phone rotation, converts to RGB, caps the long edge at 4000px, keeps PNG only when transparency matters.
Also finds each image's focal point and records it in OUT_DIR/.focus.json, which every builder uses to crop to its layout."""
import json, os, sys
from PIL import Image, ImageFilter, ImageOps

def focus(im):
    """Focal point as (x%, y%): where the people are when skin shows, else the centre of detail and colour, pulled gently toward the middle."""
    sm = im.convert("RGB").resize((64, max(1, round(64 * im.height / im.width))) if im.width >= im.height else (max(1, round(64 * im.width / im.height)), 64))
    w, h = sm.size
    edges = sm.convert("L").filter(ImageFilter.FIND_EDGES).load()
    hsv, px = sm.convert("HSV").load(), sm.load()
    dx = dy = dw = sx = sy = sn = 0.0
    for y in range(1, h - 1):
        for x in range(1, w - 1):
            r, g, b = px[x, y]
            hue, sat, val = hsv[x, y]
            # Gentle centre bias, so an even texture still lands in the middle.
            wgt = (edges[x, y] / 255 + 0.25 * sat / 255 * val / 255) * (1 - 0.25 * (((x / (w - 1) - 0.5) * 2) ** 2 + ((y / (h - 1) - 0.5) * 2) ** 2))
            dx += x * wgt; dy += y * wgt; dw += wgt
            # Skin: reddish hue, moderate saturation, not dark. People are what a crop must keep.
            if r > 90 and r > g > b and r - b > 25 and hue < 40 and 40 < sat < 170:
                sx += x; sy += y; sn += 1
    if not dw and not sn: return 50, 50
    fx, fy = (dx / dw, dy / dw) if dw else (sx / sn, sy / sn)
    # Enough skin to be a person (half a percent of the frame): it leads, detail only nudges.
    if sn >= 0.005 * w * h: fx, fy = 0.8 * sx / sn + 0.2 * fx, 0.8 * sy / sn + 0.2 * fy
    snap = lambda v: int(min(90, max(10, round(v * 20) * 5)))
    return snap(fx / (w - 1)), snap(fy / (h - 1))

def slug(name):
    base = os.path.splitext(os.path.basename(name))[0].lower()
    return "".join(c if c.isalnum() else "-" for c in base).strip("-") or "image"

def main():
    out_dir, files = sys.argv[1], sys.argv[2:]
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    fpath = os.path.join(out_dir, ".focus.json")
    try: focal = json.load(open(fpath))
    except (OSError, ValueError): focal = {}
    for f in files:
        try:
            im = Image.open(f)
            im = ImageOps.exif_transpose(im)
        except Exception as e:
            rows.append(f"| {os.path.basename(f)} | could not open ({e.__class__.__name__}); ask for JPG or PNG | | | | | |")
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
        fx, fy = focus(im)
        focal[os.path.basename(dest)] = f"{fx}% {fy}%"
        if alpha: im.save(dest, optimize=True)
        else: im.save(dest, quality=90, optimize=True)
        # Widest it can print sharply: 200 dpi is good, 150 dpi is the floor.
        good, floor = w / 200, w / 150
        if good >= 6.5 and orient == "landscape": use = "hero, full width, anything"
        elif good >= 3: use = "media row, figure, gallery"
        elif floor >= 2: use = "gallery or social only"
        else: use = "too small for print; social only"
        rows.append(f"| {os.path.relpath(dest)} | {w}×{h} | {orient} | {good:.1f} in | {floor:.1f} in | {use} | {fx}% {fy}% |")
    json.dump(focal, open(fpath, "w"), indent=1, sort_keys=True)
    print("| File | Pixels | Orientation | Sharp up to (200 dpi) | Floor (150 dpi) | Print fit | Focus |")
    print("|---|---|---|---|---|---|---|")
    print("\n".join(rows))

if __name__ == "__main__":
    main()
