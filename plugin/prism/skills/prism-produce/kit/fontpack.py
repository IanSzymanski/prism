#!/usr/bin/env python3
"""Zips the Office-named fonts PowerPoint needs to open and present decks in a brand.
Usage: fontpack.py OUT.zip [BRAND]   (BRAND default: the brand marked default; names come from its profile's office.fonts)"""
import glob, json, os, sys, zipfile


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
out = sys.argv[1]
brand = sys.argv[2] if len(sys.argv) > 2 else default_brand()
prof = json.load(open(os.path.join(KIT, "brands", brand, "profile.json")))
names = prof.get("office", {}).get("fonts")
if not names: sys.exit(f"[fonts] brand {brand} names no Office fonts (profile office.fonts)")
folder = os.path.splitext(os.path.basename(out))[0]
README = f"""{prof["name"]} fonts for PowerPoint

Install every font in this folder before opening or presenting a {prof["name"]} deck.
{", ".join(sorted(set(names.values())))} are the brand fonts, named for Office.
Without them PowerPoint swaps in other fonts and slides reflow.

All fonts are under the SIL Open Font License.
"""
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("README.txt", README)
    for f in sorted(os.path.join(KIT, "brands", brand, p) for p in prof["office"].get("files", {})):
        z.write(f, f"{folder}/{os.path.basename(f)}")
print(f"wrote {out}")
