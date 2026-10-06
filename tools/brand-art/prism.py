#!/usr/bin/env python3
"""Draws the Prism design system's artwork from its own fonts and tokens: logo family, fan art and test images.
Usage: prism.py DESIGN_SYSTEM_PROJECT_DIR OUT_DIR   (writes OUT_DIR/assets/<Group>/..., ready to upload)"""
import json, math, os, subprocess, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

SRC, OUT = sys.argv[1], sys.argv[2]
T = json.load(open(os.path.join(SRC, "tokens.json")))
TOK = {t["name"]: t["value"] for t in T["color"]["tokens"]}
def tok(n, theme="light"):
    v = TOK[n]; v = v if isinstance(v, str) else v.get(theme, v["light"])
    return tok(v[1:-1], theme) if v.startswith("{") else v
os.makedirs(os.path.join(OUT, "assets", "Logos"), exist_ok=True)
for g in ("Spectrum", "Templates"): os.makedirs(os.path.join(OUT, "assets", g), exist_ok=True)

# ---------- Wordmark: "prism" outlined from Bricolage Grotesque Bold, kerned by HarfBuzz ----------
FONT = os.path.join(SRC, "fonts", "BricolageGrotesque-Bold.ttf")
blob = hb.Blob.from_file_path(FONT); face = hb.Face(blob); font = hb.Font(face)
buf = hb.Buffer(); buf.add_str("prism"); buf.guess_segment_properties(); hb.shape(font, buf, {"kern": True, "liga": True})
tt = TTFont(FONT); gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
UPM, CAP, XH, DESC = 1000, tt["OS/2"].sCapHeight, tt["OS/2"].sxHeight, 270
x, paths, ink_left, ink_right = 0, [], None, 0
from fontTools.pens.boundsPen import BoundsPen
for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
    name = order[info.codepoint]
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    gs[name].draw(TransformPen(pen, (1, 0, 0, -1, x + pos.x_offset, 0)))
    bp = BoundsPen(gs); gs[name].draw(bp)
    if bp.bounds:
        l, b, r, t = bp.bounds
        ink_left = (x + l) if ink_left is None else min(ink_left, x + l); ink_right = max(ink_right, x + r)
    paths.append(pen.getCommands()); x += pos.x_advance
WORD = "".join(paths)
ASC_INK = 760  # the i's dot and the tallest ink sit below this; the p's descender reaches -DESC
# ---------- Glyph: an inverted equilateral triangle cut at its edge midpoints; three corners in hue, the centre open ----------
GH = CAP + 40                      # glyph height: a little over the cap height
GS = GH * 2 / math.sqrt(3)          # side
def glyph(x0, base, colors, cut=0.075):
    top, bot = base - GH, base
    A, Bv, Cv = (x0, top), (x0 + GS, top), (x0 + GS / 2, bot)
    mid = lambda p, q: ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
    AB, BC, CA = mid(A, Bv), mid(Bv, Cv), mid(Cv, A)
    # Each corner piece keeps its outer corner on the big triangle and shrinks toward it, so the cuts are thin and inside.
    def toward(corner, tri):
        k = 1 - cut
        return [(corner[0] + (p[0] - corner[0]) * k, corner[1] + (p[1] - corner[1]) * k) for p in tri]
    tris = [(toward(A, [A, AB, CA]), colors[0]), (toward(Bv, [AB, Bv, BC]), colors[1]), (toward(Cv, [CA, BC, Cv]), colors[2])]
    return "".join(f'<polygon points="{" ".join(f"{p[0]:.1f},{p[1]:.1f}" for p in t)}" fill="{c}"/>' for t, c in tris)

HUES = [tok("hue-2", "dark"), tok("hue-4", "dark"), tok("hue-1", "dark")]  # amber top-left, blue top-right, red bottom (README)
INK, WHITE = tok("fg"), "#ffffff"
GAP = 150
W = ink_right + GAP + GS + 10
PAD = 40
VB = f"{ink_left - PAD:.0f} {-ASC_INK - PAD:.0f} {W - ink_left + 2 * PAD:.0f} {ASC_INK + DESC + 2 * PAD:.0f}"

def logo(word_fill, glyph_colors, name, title="Prism"):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{VB}" role="img" aria-label="{title}"><title>{title}</title>'
           f'<path fill="{word_fill}" d="{WORD}"/>{glyph(ink_right + GAP, 0, glyph_colors)}</svg>')
    open(os.path.join(OUT, "assets", "Logos", name), "w").write(svg); return svg
def glyph_only(colors, name):
    vb = f"{-PAD} {-GH - PAD:.0f} {GS + 2 * PAD:.0f} {GH + 2 * PAD:.0f}"
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Prism"><title>Prism</title>{glyph(0, 0, colors)}</svg>'
    open(os.path.join(OUT, "assets", "Logos", name), "w").write(svg); return svg
SV = {
  "prism-logo.svg": logo(INK, HUES, "prism-logo.svg"),
  "prism-logo-light.svg": logo(WHITE, HUES, "prism-logo-light.svg"),
  "prism-logo-mono.svg": logo(INK, [INK] * 3, "prism-logo-mono.svg"),
  "prism-logo-mono-light.svg": logo(WHITE, [WHITE] * 3, "prism-logo-mono-light.svg"),
  "prism-glyph.svg": glyph_only(HUES, "prism-glyph.svg"),
  "prism-glyph-mono.svg": glyph_only([INK] * 3, "prism-glyph-mono.svg"),
  "prism-glyph-mono-light.svg": glyph_only([WHITE] * 3, "prism-glyph-mono-light.svg"),
}

# ---------- Fan: the white beam enters the left face, four bands leave the right face and widen to the edge ----------
def fan_svg(W, H, theme, ground=None):
    """The brand's glyph (an inverted triangle) with the four bands leaving its lower right edge and widening to the frame edge.
    Flat: no beam, no gradient, no outline."""
    c = {i: tok(f"hue-{i}", theme) for i in (1, 2, 3, 4)}
    gh = H * 0.20; gs = gh * 2 / math.sqrt(3); ox, oy = W * 0.66, H * 0.40
    A, Bv, Cv = (ox - gs / 2, oy), (ox + gs / 2, oy), (ox, oy + gh)          # top-left, top-right, bottom apex
    lerp = lambda p, q, t: (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
    exits = [lerp(Bv, Cv, 0.30 + 0.10 * i) for i in range(5)]               # along the right edge, below its top
    ex, span, ey = W + 4, H * 0.50, oy + gh * 0.95
    ends = [(ex, ey - span / 2 + span * i / 4) for i in range(5)]
    rays = "".join(f'<polygon points="{exits[i][0]:.1f},{exits[i][1]:.1f} {exits[i+1][0]:.1f},{exits[i+1][1]:.1f} {ends[i+1][0]:.1f},{ends[i+1][1]:.1f} {ends[i][0]:.1f},{ends[i][1]:.1f}" fill="{c[i+1]}"/>' for i in range(4))
    ink = tok("fg", theme)
    tri = f'<polygon points="{A[0]:.1f},{A[1]:.1f} {Bv[0]:.1f},{Bv[1]:.1f} {Cv[0]:.1f},{Cv[1]:.1f}" fill="{ink}"/>'
    bg = f'<rect width="{W}" height="{H}" fill="{ground}"/>' if ground else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{bg}{rays}{tri}</svg>'
SV["fan-light.svg"] = fan_svg(1920, 1080, "light"); SV["fan-dark.svg"] = fan_svg(1920, 1080, "dark", tok("dark-deep"))
for n in ("fan-light.svg", "fan-dark.svg"): open(os.path.join(OUT, "assets", "Spectrum", n), "w").write(SV[n])

# ---------- Test images: flat scenes in the brand's neutrals, each labelled so nobody mistakes it for a photo ----------
def label(W, H, text, dark=False):
    col = tok("dark-muted") if dark else tok("muted")
    return f'<text x="{W * 0.04:.0f}" y="{H - W * 0.04:.0f}" font-family="IBM Plex Mono, monospace" font-weight="500" font-size="{max(18, W * 0.018):.0f}" letter-spacing="2" fill="{col}">{text}</text>'
def chip(x, y, w, h, theme="light"):
    return "".join(f'<rect x="{x + i * w / 4:.1f}" y="{y}" width="{w / 4:.1f}" height="{h}" fill="{tok(f"hue-{i+1}", theme)}"/>' for i in range(4))
def scene_landscape(W, H, dark=False):
    th = "dark" if dark else "light"
    g, s, l, fg = tok("bg", th), tok("surface", th), tok("line", th), tok("muted", th)
    out = f'<rect width="{W}" height="{H}" fill="{g}"/><rect y="{H * .68:.0f}" width="{W}" height="{H * .32:.0f}" fill="{tok("soft", th)}"/>'
    for i, (x, y, w, h) in enumerate([(.10, .30, .22, .46), (.14, .24, .22, .46), (.18, .18, .22, .46)]):
        out += f'<rect x="{W * x:.0f}" y="{H * y:.0f}" width="{W * w:.0f}" height="{H * h:.0f}" rx="{W * .01:.0f}" fill="{s}" stroke="{l}" stroke-width="3"/>'
    for k in range(6): out += f'<rect x="{W * .21:.0f}" y="{H * (.26 + k * .055):.0f}" width="{W * (.14 if k % 3 else .10):.0f}" height="{H * .018:.0f}" rx="4" fill="{fg}" opacity=".55"/>'
    for i in range(4): out += f'<rect x="{W * (.56 + i * .085):.0f}" y="{H * (.62 - .1 * (i + 1)):.0f}" width="{W * .06:.0f}" height="{H * .1 * (i + 1):.0f}" rx="{W * .006:.0f}" fill="{tok(f"hue-{i+1}", th)}"/>'
    return out
def person(W, H, dark=False):
    th = "dark" if dark else "light"
    out = f'<rect width="{W}" height="{H}" fill="{tok("accent-tint", th)}"/>'
    out += f'<circle cx="{W / 2}" cy="{H * .38:.0f}" r="{W * .17:.0f}" fill="{tok("muted", th)}"/>'
    out += f'<path d="M{W * .14:.0f},{H} C{W * .14:.0f},{H * .66:.0f} {W * .30:.0f},{H * .60:.0f} {W / 2},{H * .60:.0f} C{W * .70:.0f},{H * .60:.0f} {W * .86:.0f},{H * .66:.0f} {W * .86:.0f},{H} Z" fill="{tok("muted", th)}"/>'
    return out
def tiles(W, H):
    out = f'<rect width="{W}" height="{H}" fill="{tok("bg")}"/>'
    for r in range(3):
        for c in range(3):
            x, y, w = W * (.08 + c * .29), H * (.08 + r * .29), W * .26
            out += f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{w:.0f}" rx="{W * .02:.0f}" fill="{tok("surface")}" stroke="{tok("line")}" stroke-width="3"/>'
            out += chip(x + w * .12, y + w * .14, w * .5, w * .05)
            for k in range(3): out += f'<rect x="{x + w * .12:.0f}" y="{y + w * (.34 + k * .16):.0f}" width="{w * (.7 if k < 2 else .45):.0f}" height="{w * .06:.0f}" rx="4" fill="{tok("line")}"/>'
    return out
def screen(W, H):
    out = f'<rect width="{W}" height="{H}" fill="{tok("bg")}"/><rect x="{W * .05:.0f}" y="{H * .07:.0f}" width="{W * .9:.0f}" height="{H * .86:.0f}" rx="18" fill="{tok("surface")}" stroke="{tok("line")}" stroke-width="3"/>'
    out += f'<rect x="{W * .05:.0f}" y="{H * .07:.0f}" width="{W * .9:.0f}" height="{H * .07:.0f}" rx="18" fill="{tok("soft")}"/>'
    for i in range(3): out += f'<circle cx="{W * (.08 + i * .025):.0f}" cy="{H * .105:.0f}" r="{H * .012:.0f}" fill="{tok("line")}"/>'
    out += f'<rect x="{W * .05:.0f}" y="{H * .14:.0f}" width="{W * .18:.0f}" height="{H * .79:.0f}" fill="{tok("soft")}"/>'
    for k in range(6): out += f'<rect x="{W * .07:.0f}" y="{H * (.2 + k * .07):.0f}" width="{W * .12:.0f}" height="{H * .025:.0f}" rx="4" fill="{tok("accent") if k == 1 else tok("line")}"/>'
    for c in range(3):
        x = W * (.27 + c * .22)
        out += f'<rect x="{x:.0f}" y="{H * .2:.0f}" width="{W * .19:.0f}" height="{H * .3:.0f}" rx="12" fill="{tok("surface")}" stroke="{tok("line")}" stroke-width="3"/>' + chip(x + 24, H * .23, W * .06, 8)
        out += f'<rect x="{x + 24:.0f}" y="{H * .3:.0f}" width="{W * .1:.0f}" height="{H * .06:.0f}" rx="6" fill="{tok(f"hue-{c+1}")}"/>'
    out += f'<rect x="{W * .27:.0f}" y="{H * .56:.0f}" width="{W * .63:.0f}" height="{H * .3:.0f}" rx="12" fill="{tok("surface")}" stroke="{tok("line")}" stroke-width="3"/>'
    out += f'<rect x="{W * .72:.0f}" y="{H * .78:.0f}" width="{W * .15:.0f}" height="{H * .055:.0f}" rx="8" fill="{tok("accent")}"/>'
    return out
TEMPLATES = {
  "sample-landscape.png": (1800, 1200, lambda W, H: scene_landscape(W, H), "SAMPLE IMAGE · LANDSCAPE 3:2", False),
  "sample-landscape-dark.png": (1800, 1200, lambda W, H: scene_landscape(W, H, True), "SAMPLE IMAGE · LANDSCAPE 3:2 · DARK", True),
  "sample-portrait-person.png": (1200, 1500, lambda W, H: person(W, H), "SAMPLE IMAGE · PERSON 4:5", False),
  "sample-square.png": (1400, 1400, lambda W, H: tiles(W, H), "SAMPLE IMAGE · SQUARE 1:1", False),
  "sample-wide.png": (2400, 1200, lambda W, H: scene_landscape(W, H), "SAMPLE IMAGE · WIDE 2:1", False),
  "sample-screen.png": (1920, 1200, lambda W, H: screen(W, H), "SAMPLE SCREEN · 16:10", False),
}
html = []
for n, (W, H, fn, lab, dark) in TEMPLATES.items():
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">{fn(W, H)}{label(W, H, lab, dark)}</svg>'
    html.append((os.path.join(OUT, "assets", "Templates", n), svg, W, H))
pngs = [(os.path.join(OUT, "assets", "Logos", "prism-logo.png"), SV["prism-logo.svg"], 1200, None),
        (os.path.join(OUT, "assets", "Logos", "prism-logo-light.png"), SV["prism-logo-light.svg"], 1200, None),
        (os.path.join(OUT, "assets", "Logos", "prism-glyph.png"), SV["prism-glyph.svg"], 512, None)]
job = os.path.join(OUT, ".raster.json")
json.dump([[p, s, w, h] for p, s, w, h in html + pngs], open(job, "w"))
subprocess.run(["node", os.path.join(os.path.dirname(os.path.abspath(__file__)), "raster.js"), job], check=True)
os.remove(job)
print("wrote", len(SV), "svgs and", len(html) + len(pngs), "pngs to", OUT)
