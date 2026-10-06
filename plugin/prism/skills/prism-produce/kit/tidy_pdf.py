#!/usr/bin/env python3
"""Joins Chromium's one-glyph-at-a-time text into whole runs, so copying, searching and screen readers get
whole lines instead of one object per letter. The page looks exactly the same.
Usage: tidy_pdf.py file.pdf"""
import sys
import pikepdf
from pikepdf import Operator, Array


def widths(font):
    """Glyph widths (1/1000 em) for a Type0 font, from its descendant's /W array."""
    d = font.get("/DescendantFonts")
    if not d: return None
    d = d[0]
    dw = float(d.get("/DW", 1000))
    w, table, i = d.get("/W", Array()), {}, 0
    while i < len(w):
        first = int(w[i])
        if isinstance(w[i + 1], pikepdf.Array):
            for k, v in enumerate(w[i + 1]): table[first + k] = float(v)
            i += 2
        else:
            for c in range(first, int(w[i + 1]) + 1): table[c] = float(w[i + 2])
            i += 3
    return lambda cid: table.get(cid, dw)


def cids(s):
    b = bytes(s)
    return [b[k] << 8 | b[k + 1] for k in range(0, len(b) - 1, 2)]


def tidy(path):
    pdf = pikepdf.open(path, allow_overwriting_input=True)
    for page in pdf.pages:
        new = rebuild(page)
        if new is not None:
            page.obj.Contents = pdf.make_stream(pikepdf.unparse_content_stream(new))
    pdf.save(path)


def rebuild(page):
    """Walks the stream once, merging `Tj (Td x 0 Tj)*` sequences into one TJ with kerning numbers."""
    fonts = {}
    res = page.obj.get("/Resources", {})
    for name, f in (res.get("/Font") or {}).items():
        fonts[name] = widths(f) if f.get("/Subtype") == "/Type0" else None
    ins = list(pikepdf.parse_content_stream(page))
    out, i, font, size, merged = [], 0, None, 0.0, False
    pending = 0.0  # a merged run leaves the line start at its first glyph; the next Td must add the distance it skipped
    while i < len(ins):
        op, args = str(ins[i].operator), ins[i].operands
        if op == "Tf":
            font, size = fonts.get(str(args[0])), float(args[1])
        if op in ("BT", "Tm"):
            pending = 0.0
        if op == "Td" and pending:
            out.append(pikepdf.ContentStreamInstruction([float(args[0]) + pending, float(args[1])], Operator("Td")))
            pending, i = 0.0, i + 1
            continue
        if op == "Tj" and font and size:
            items, adv, j = [args[0]], sum(font(c) for c in cids(args[0])) * size / 1000, i + 1
            moved = 0.0  # distance from the run's first glyph to the current glyph
            last_w = adv
            while j + 1 < len(ins) and str(ins[j].operator) == "Td" and float(ins[j].operands[1]) == 0 \
                    and str(ins[j + 1].operator) == "Tj":
                x = float(ins[j].operands[0])
                kern = round(-(x - last_w) * 1000 / size, 3)
                if abs(kern) >= 0.001: items.append(kern)
                s = ins[j + 1].operands[0]
                items.append(s)
                moved += x
                last_w = sum(font(c) for c in cids(s)) * size / 1000
                j += 2
            if j > i + 1:
                merged = True
                out.append(pikepdf.ContentStreamInstruction([Array(items)], Operator("TJ")))
                pending = moved
                i = j
                continue
        out.append(ins[i])
        i += 1
    return out if merged else None


if __name__ == "__main__":
    tidy(sys.argv[1])
