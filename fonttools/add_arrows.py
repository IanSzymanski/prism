#!/usr/bin/env python3
"""Adds the four arrows (← ↑ → ↓) to every kit font from the matching Google Fonts upstream instance.
Dev tool, not shipped. Usage: add_arrows.py UPSTREAM_DIR KIT_FONTS_DIR (run it on the original fonts; a second run changes nothing)
UPSTREAM_DIR holds Inter[opsz,wght].ttf, Literata[opsz,wght].ttf and IBMPlexMono-Medium.ttf from github.com/google/fonts."""
import os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.varLib.instancer import instantiateVariableFont

ARROWS = [0x2190, 0x2191, 0x2192, 0x2193]
# Kit font -> upstream file and instance. The kit's "Bold" office cuts are wght 600, same as print SemiBold.
FONTS = {
    "print/Inter-Regular.ttf": ("Inter[opsz,wght].ttf", 400, 14),
    "print/Inter-Medium.ttf": ("Inter[opsz,wght].ttf", 500, 14),
    "print/Inter-SemiBold.ttf": ("Inter[opsz,wght].ttf", 600, 14),
    "office/CAInter-Regular.ttf": ("Inter[opsz,wght].ttf", 400, 14),
    "office/CAInter-Bold.ttf": ("Inter[opsz,wght].ttf", 600, 14),
    "print/Literata-Regular.ttf": ("Literata[opsz,wght].ttf", 400, 32),
    "print/Literata-Medium.ttf": ("Literata[opsz,wght].ttf", 500, 32),
    "print/Literata-SemiBold.ttf": ("Literata[opsz,wght].ttf", 600, 32),
    "office/CALiterata-Regular.ttf": ("Literata[opsz,wght].ttf", 400, 32),
    "office/CALiterata-Bold.ttf": ("Literata[opsz,wght].ttf", 600, 32),
    "print/IBMPlexMono-Medium.ttf": ("IBMPlexMono-Medium.ttf", None, None),
    "office/CAMono-Regular.ttf": ("IBMPlexMono-Medium.ttf", None, None),
    "IBMPlexMono-500.woff2": ("IBMPlexMono-Medium.ttf", None, None),
}
CHECK = "aegHRQ5W"  # advances that must match, proving the instance is the kit's design


def source(up, name, wght, opsz, cache={}):
    key = (name, wght, opsz)
    if key not in cache:
        f = TTFont(os.path.join(up, name))
        cache[key] = instantiateVariableFont(f, {"wght": wght, "opsz": opsz}) if wght else f
    return cache[key]


def advances(f):
    cm = f.getBestCmap()
    return [round(f["hmtx"][cm[ord(c)]][0]) for c in CHECK]


def add(kit_path, src):
    f = TTFont(kit_path)
    if advances(f) != advances(src):
        sys.exit(f"{kit_path}: upstream instance does not match the kit font")
    scm, cm, gs = src.getBestCmap(), f.getBestCmap(), src.getGlyphSet()
    order = f.getGlyphOrder()
    added = []
    for u in ARROWS:
        if u in cm: continue
        if scm[u] in f["glyf"].glyphs:  # the subset kept the glyph unmapped (Inter's "->" ligature), so just map it
            for t in f["cmap"].tables:
                if t.isUnicode(): t.cmap[u] = scm[u]
            added.append(chr(u)); continue
        name = f"uni{u:04X}"
        pen = TTGlyphPen(None)
        gs[scm[u]].draw(pen)  # draws composites as plain outlines
        f["glyf"][name] = pen.glyph()
        f["glyf"][name].recalcBounds(f["glyf"])
        f["hmtx"][name] = (round(src["hmtx"][scm[u]][0]), f["glyf"][name].xMin)
        if "vmtx" in f:  # Literata has vertical metrics; Chromium rejects the font if a glyph lacks them
            sv = src["vmtx"][scm[u]] if "vmtx" in src else (f["vhea"].advanceHeightMax, 0)
            f["vmtx"][name] = (round(sv[0]), round(sv[1]))
        if name not in order: order.append(name)  # glyf may already have added it
        for t in f["cmap"].tables:
            if t.isUnicode(): t.cmap[u] = name
        added.append(chr(u))
    if added:
        f.setGlyphOrder(order)
        f["maxp"].numGlyphs = len(order)
        f["OS/2"].usLastCharIndex = max(f.getBestCmap())
        f.save(kit_path)
        try:  # Chromium drops any font the OpenType Sanitizer rejects, so check with the same rules
            import ots
            if ots.sanitize(kit_path, capture_output=True).returncode: sys.exit(f"{kit_path}: fails the OpenType Sanitizer")
        except ImportError:
            print("  (pip install opentype-sanitizer to check the font as Chromium will)")
    print(f"{kit_path}: added {''.join(added) or 'nothing'}")


up, kit = sys.argv[1], sys.argv[2]
for rel, (name, w, o) in FONTS.items():
    add(os.path.join(kit, rel), source(up, name, w, o))
