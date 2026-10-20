#!/usr/bin/env python3
"""Checks that the Prism tutorial (prism-draft/references/tutorial.md) still matches the plugin it describes.
Usage: check-tutorial.py [VERSION]   (exit 1 and a list of problems when it is out of date)
Run by tests/tutorial.test.py and by tools/build.py before every build, so a stale tutorial can't ship.

What it checks:
- every command in plugin/prism/commands is named (/prism-...);
- every output format (a card in prism-produce/references/formats) and every skill has its phrase in the tutorial;
- the brands are listed at run time with `run.sh brands` (core names no brand), and the packages with `run.sh packages`;
- the "tutorial-reviewed" stamp matches the version's major.minor, so every release's changes get a look;
- the guided walkthrough (prism-draft/references/walkthrough.md, /prism-tutorial with no topic) covers every stage, names every
  output format, has its own reviewed stamp, and every sample it runs (the kit's, and each brand's own) is complete.
A new format or skill without an entry in PHRASES below fails until it is added here and in the tutorial."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# PRISM_PLUGIN points at another copy of the plugin (the tests check a changed copy).
PLUGIN = os.environ.get("PRISM_PLUGIN", os.path.join(ROOT, "plugin", "prism"))
TUTORIAL = os.path.join(PLUGIN, "skills", "prism-draft", "references", "tutorial.md")
WALKTHROUGH = os.path.join(PLUGIN, "skills", "prism-draft", "references", "walkthrough.md")
KIT = os.path.join(PLUGIN, "skills", "prism-produce", "kit")

# How the tutorial names each format card and skill, in words a person uses.
PHRASES = {
    "format:sheet": ["one sheet"], "format:brochure": ["brochure"], "format:5x7": ["5x7 card"], "format:deck": ["deck"], "format:social": ["social post", "stories"],
    "format:email": ["email header"], "format:html-email": ["HTML email"], "format:carousel": ["carousel"], "format:blog": ["blog post"], "format:motion": ["animated film"],
    "skill:prism-draft": ["Full process", "Proof"], "skill:prism-produce": ["Produce", "Revising"], "skill:prism-quick": ["Quick mode"], "skill:prism-onboard": ["Add a brand"],
}
CARDS_NOT_FORMATS = {"components"}
# The walkthrough's stages, in words it must use: the proof, design mode, the export and the other formats.
STAGES = ["Claude Docs", "Claude Design", "export", "other formats", "Why it's here", "What you can do", "Sharing"]
SAMPLE_KEYS = ["slug", "title", "prompt", "answers", "source", "try", "more"]


def sample_problems(d, label, cards):
    """A walkthrough sample (sample.json and its source files) is complete and offers only real formats."""
    out, f = [], os.path.join(d, "sample.json")
    try: s = json.load(open(f, encoding="utf8"))
    except Exception as e: return [f"{label} sample: {f} can't be read ({e})"]
    out += [f"{label} sample: no \"{k}\" in sample.json" for k in SAMPLE_KEYS if not s.get(k)]
    out += [f"{label} sample: source file {x} is missing" for x in s.get("source", []) if not os.path.exists(os.path.join(d, x))]
    out += [f"{label} sample: \"{k}\" in try is missing" for k in ["proof", "design", "revise"] if k not in (s.get("try") or {})]
    out += [f"{label} sample: more offers {m.get('format')}, which is not an output format" for m in s.get("more", []) if m.get("format") not in cards]
    if (s.get("answers") or {}).get("figures") != "illustrative": out.append(f"{label} sample: answers.figures must be illustrative (the sample is fictional)")
    return out


def stamp(t, name, version):
    m = re.search(r"<!--\s*" + name + r"-reviewed:\s*([\d.]+)\s*-->", t)
    want = ".".join(version.split("-")[0].split(".")[:2])
    if not m: return [f"the {name} has no <!-- {name}-reviewed: X.Y --> stamp"]
    if m.group(1) != want: return [f"the {name} was last reviewed for {m.group(1)}, this is {want}: read it against this release's changes, update it, then set the stamp to {want}"]
    return []


def problems(version=None):
    out = []
    t = open(TUTORIAL, encoding="utf8").read()
    low = t.lower()
    has = lambda p: p.lower() in low
    # Commands: every one is named.
    cmds = sorted(f[:-3] for f in os.listdir(os.path.join(PLUGIN, "commands")) if f.endswith(".md"))
    for c in cmds:
        if f"/{c}" not in t: out.append(f"command /{c} is not in the tutorial")
    # Formats and skills.
    cards = sorted(f[:-3] for f in os.listdir(os.path.join(PLUGIN, "skills", "prism-produce", "references", "formats")) if f.endswith(".md") and f[:-3] not in CARDS_NOT_FORMATS)
    skills = sorted(d for d in os.listdir(os.path.join(PLUGIN, "skills")) if os.path.isdir(os.path.join(PLUGIN, "skills", d)))
    for key in [f"format:{c}" for c in cards] + [f"skill:{s}" for s in skills]:
        if key not in PHRASES: out.append(f"{key} is new: add how the tutorial names it to PHRASES in tools/check-tutorial.py, and describe it in the tutorial"); continue
        for p in PHRASES[key]:
            if not has(p): out.append(f"{key}: the tutorial never says \"{p}\"")
    # Brands are listed at run time (core names none, tests/core-brand-free.test.py), so the tutorial must say how.
    if "run.sh brands" not in t: out.append("the tutorial must tell the presenter to list the brands with `run.sh brands`")
    # Packages are listed at run time too (core and brand packages), so the tutorial says how.
    if "run.sh packages" not in t: out.append("the tutorial must tell the presenter to list the packages with `run.sh packages`")
    # The reviewed stamp: one look per release (major.minor).
    if version: out += stamp(t, "tutorial", version)
    # The guided walkthrough: /prism-tutorial runs it, it covers every stage and format, and its samples are complete.
    if not os.path.exists(WALKTHROUGH): return out + ["the walkthrough (skills/prism-draft/references/walkthrough.md) is missing"]
    w = open(WALKTHROUGH, encoding="utf8").read()
    if "walkthrough.md" not in open(os.path.join(PLUGIN, "commands", "prism-tutorial.md"), encoding="utf8").read(): out.append("/prism-tutorial does not run the walkthrough (walkthrough.md)")
    if "run.sh tutorial" not in w: out.append("the walkthrough must set the sample up with `run.sh tutorial`")
    out += [f"the walkthrough never says \"{p}\"" for p in STAGES if p.lower() not in w.lower()]
    for c in cards:
        out += [f"format:{c}: the walkthrough never says \"{p}\"" for p in PHRASES.get(f"format:{c}", []) if p.lower() not in w.lower()]
    if version: out += stamp(w, "walkthrough", version)
    out += sample_problems(os.path.join(KIT, "tutorial"), "the kit's", cards)
    brands = os.path.join(KIT, "brands")
    for b in sorted(os.listdir(brands)) if os.path.isdir(brands) else []:
        if os.path.exists(os.path.join(brands, b, "tutorial", "sample.json")): out += sample_problems(os.path.join(brands, b, "tutorial"), f"brand {b}'s", cards)
    return out


if __name__ == "__main__":
    ver = sys.argv[1] if len(sys.argv) > 1 else open(os.path.join(PLUGIN, "skills", "prism-produce", "kit", "VERSION")).read().strip()
    p = problems(ver)
    for x in p: print("tutorial:", x)
    print("tutorial up to date" if not p else f"tutorial out of date: {len(p)} problem(s)")
    sys.exit(1 if p else 0)
