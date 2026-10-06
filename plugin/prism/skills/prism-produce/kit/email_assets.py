#!/usr/bin/env python3
"""Prepares images for an HTML email. Usage: email_assets.py jobs.json  (prints results as JSON)
Each job: {"src", "out", "width" (display px), "halo" (hex or null)}.
Images are saved at 2x their display width (never upscaled). Opaque images become JPEG, images with
transparency stay PNG. A halo is a soft outline in the given colour, baked into transparent images
(logos, icons) so they stay readable in clients that invert colours without supporting dark-mode CSS."""
import json, os, sys
from PIL import Image, ImageFilter

jobs = json.load(open(sys.argv[1]))
res = []
for j in jobs:
    im = Image.open(j["src"])
    if getattr(im, "is_animated", False):
        # Animated GIF: copied as is, so it still plays. Outlook shows only the first frame.
        import shutil
        out = os.path.splitext(j["out"])[0] + ".gif"; shutil.copyfile(j["src"], out)
        res.append({"src": j["src"], "out": out, "w": im.width, "h": im.height, "srcW": im.width,
                    "kb": round(os.path.getsize(out) / 1024), "alpha": True, "animated": True})
        continue
    im.load()
    alpha = im.mode in ("RGBA", "LA", "P") and im.convert("RGBA").getchannel("A").getextrema()[0] < 255
    im = im.convert("RGBA" if alpha else "RGB")
    if j.get("square"):
        side = min(im.size); l, t = (im.width - side) // 2, (im.height - side) // 3
        # Centred on the focal point when images.py found one (a face high in a portrait stays in the circle).
        if j.get("focus"):
            fx, fy = (float(v.rstrip("%")) / 100 for v in j["focus"].split())
            l = round(min(im.width - side, max(0, fx * im.width - side / 2)))
            t = round(min(im.height - side, max(0, fy * im.height - side / 2)))
        im = im.crop((l, t, l + side, t + side))
    w0, h0 = im.size
    target = min(w0, j["width"] * 2)
    if target < w0:
        im = im.resize((target, round(h0 * target / w0)), Image.LANCZOS)
    if alpha and j.get("halo"):
        a = im.getchannel("A")
        r = max(2, round(im.width / 300))
        grown = a.filter(ImageFilter.MaxFilter(r * 2 + 1)).filter(ImageFilter.GaussianBlur(r / 2))
        c = tuple(int(j["halo"].lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
        halo = Image.new("RGBA", im.size, c + (0,))
        halo.putalpha(grown.point(lambda v: int(v * 0.9)))
        halo.alpha_composite(im)
        im = halo
    out = j["out"]
    if alpha:
        out = os.path.splitext(out)[0] + ".png"
        im.save(out, optimize=True)
    else:
        out = os.path.splitext(out)[0] + ".jpg"
        im.save(out, quality=82, optimize=True, progressive=True)
    res.append({"src": j["src"], "out": out, "w": im.width, "h": im.height, "srcW": w0,
                "kb": round(os.path.getsize(out) / 1024), "alpha": alpha})
print(json.dumps(res))
