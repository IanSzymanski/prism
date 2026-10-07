#!/usr/bin/env python3
"""Core names no brand: no brand's identifying words (its profile's identity.terms, plus its name unless that is the product's)
appear anywhere in the plugin outside kit/brands/, or in the build script.
Brand-specific defaults (the default brand, audience, contact line, email tool) live in the profiles and are read at run time.
Usage: python3 tests/core-brand-free.test.py"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDS = os.path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit", "brands")
CORE = [os.path.join(ROOT, "plugin", "prism"), os.path.join(ROOT, "tools", "build.py")]
SKIP_DIRS = {"brands", "node_modules", "mods", "cache", "vendor", "__pycache__"}
TEXT = re.compile(r"\.(md|json|js|py|lua|css|html|sh|txt)$")
fails, n = [], 0


def check(name, ok, detail=""):
    global n
    n += 1
    if not ok: fails.append(f"{name}: {detail}")


terms = {}
for b in sorted(os.listdir(BRANDS)):
    pf = os.path.join(BRANDS, b, "profile.json")
    if not os.path.exists(pf): continue
    p = json.load(open(pf, encoding="utf8"))
    t = list((p.get("identity") or {}).get("terms", []))
    if p["name"].lower() != "prism": t.append(p["name"])
    check(f"{b} declares identity terms", bool((p.get("identity") or {}).get("terms")), "add identity.terms to its profile")
    terms[b] = sorted(set(t))

files = []
for c in CORE:
    if os.path.isfile(c): files.append(c); continue
    for d, ds, fs in os.walk(c):
        ds[:] = [x for x in ds if x not in SKIP_DIRS]
        files += [os.path.join(d, f) for f in fs if TEXT.search(f)]

for f in files:
    s = open(f, encoding="utf8", errors="ignore").read()
    rel = os.path.relpath(f, ROOT)
    for b, ts in terms.items():
        for t in ts:
            hits = [m.start() for m in re.finditer(r"(?<![\w-])" + re.escape(t) + r"(?![\w-])", s, re.I)]
            line = s[:hits[0]].count("\n") + 1 if hits else 0
            check(f"{rel} free of {b}", not hits, f"says \"{t}\" (line {line})")

# The defaults that used to be written into core now come from the profiles.
marked = [b for b in terms if json.load(open(os.path.join(BRANDS, b, "profile.json"))).get("default") is True]
check("exactly one brand is the default", len(marked) == 1, marked)
for f in files:
    if f.endswith((".js", ".py")):
        s = open(f, encoding="utf8").read()
        for b in terms:
            if b == "prism": continue  # the product's own name, used in paths everywhere
            check(f"{os.path.relpath(f, ROOT)} has no hardcoded brand id {b}", not re.search(r"[\"']" + re.escape(b) + r"[\"']", s), b)

for x in fails: print("FAIL", x)
print(f"{n - len(fails)}/{n} checks passed ({len(files)} core files, {sum(map(len, terms.values()))} brand terms)")
sys.exit(1 if fails else 0)
