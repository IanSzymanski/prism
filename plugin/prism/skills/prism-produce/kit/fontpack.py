#!/usr/bin/env python3
"""Zips the Office-named fonts PowerPoint needs to open and present decks in a brand.
Usage: fontpack.py OUT.zip [BRAND]   (BRAND default: the brand marked default; names come from its profile's office.fonts)"""
import glob, json, os, sys, zipfile


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brandpath import brand_dir, brand_file, default_brand, snapshot_dir

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

All fonts are under the SIL Open Font License; its text, with each font's copyright, is in licenses/.
"""
fonts = sorted(brand_file(brand, p) for p in prof["office"].get("files", {}))
# The font license travels with every copy (OFL condition 2): license files beside the fonts and in the brand's licenses/.
licenses = sorted({os.path.abspath(f) for d in {os.path.dirname(f) for f in fonts} | {os.path.join(brand_dir(brand), "licenses"), os.path.join(snapshot_dir(brand), "licenses")}
                   for f in glob.glob(os.path.join(d, "*")) if os.path.isfile(f) and os.path.basename(f).upper().startswith(("OFL", "LICENSE", "LICENCE"))})
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("README.txt", README)
    for f in fonts:
        z.write(f, f"{folder}/{os.path.basename(f)}")
    for f in licenses:
        z.write(f, f"{folder}/licenses/{os.path.basename(f)}")
if not licenses: print(f"[fonts] no license text found for {brand}'s fonts: add the fonts' OFL.txt beside them or in the brand's licenses/ folder")
print(f"wrote {out}" + (f" ({len(licenses)} license file{'s' if len(licenses) != 1 else ''})" if licenses else ""))
