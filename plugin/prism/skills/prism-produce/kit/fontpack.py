#!/usr/bin/env python3
"""Zips the Office-named fonts PowerPoint needs to open and present decks in a brand.
Usage: fontpack.py OUT.zip [BRAND]   (BRAND default: the brand marked default; names come from its profile's office.fonts)"""
import glob, json, os, sys, zipfile


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brandpath import brand_dir, default_brand

KIT = os.path.dirname(os.path.abspath(__file__))
out = sys.argv[1]
brand = sys.argv[2] if len(sys.argv) > 2 else default_brand()
prof = json.load(open(os.path.join(brand_dir(brand), "profile.json")))
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
    for f in sorted(os.path.join(brand_dir(brand), p) for p in prof["office"].get("files", {})):
        z.write(f, f"{folder}/{os.path.basename(f)}")
print(f"wrote {out}")
