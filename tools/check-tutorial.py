#!/usr/bin/env python3
"""Checks that the Prism tutorial (prism-draft/references/tutorial.md) still matches the plugin it describes.
Usage: check-tutorial.py [VERSION]   (exit 1 and a list of problems when it is out of date)
Run by tests/tutorial.test.py and by chatgpt/convert.py before every build, so a stale tutorial can't ship.

What it checks:
- every command in plugin/prism/commands is named (/prism-...), inside a Claude-only section;
- every output format (a card in prism-produce/references/formats) and every skill has its phrase in the tutorial;
- the brands are listed at run time with `run.sh brands` (core names no brand);
- the ChatGPT copy (Claude-only sections removed) names no command;
- the "tutorial-reviewed" stamp matches the version's major.minor, so every release's changes get a look.
A new format or skill without an entry in PHRASES below fails until it is added here and in the tutorial."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# PRISM_PLUGIN points at another copy of the plugin (the tests check a changed copy).
PLUGIN = os.environ.get("PRISM_PLUGIN", os.path.join(ROOT, "plugin", "prism"))
TUTORIAL = os.path.join(PLUGIN, "skills", "prism-draft", "references", "tutorial.md")

# How the tutorial names each format card and skill, in words a person uses.
PHRASES = {
    "format:sheet": ["one sheet"], "format:brochure": ["brochure"], "format:deck": ["deck"], "format:social": ["social post", "stories"],
    "format:email": ["email header"], "format:html-email": ["HTML email"], "format:carousel": ["carousel"], "format:blog": ["blog post"],
    "skill:prism-draft": ["Full process", "Proof"], "skill:prism-produce": ["Produce", "Revising"], "skill:prism-quick": ["Quick mode"], "skill:prism-onboard": ["Add a brand"],
}
CARDS_NOT_FORMATS = {"components"}


def claude_only_stripped(t):
    return re.sub(r"\n?<!-- claude-only -->[\s\S]*?<!-- /claude-only -->\n?", "\n", t)


def problems(version=None):
    out = []
    t = open(TUTORIAL, encoding="utf8").read()
    low = t.lower()
    has = lambda p: p.lower() in low
    # Commands: named, and only where the ChatGPT edition won't see them.
    cmds = sorted(f[:-3] for f in os.listdir(os.path.join(PLUGIN, "commands")) if f.endswith(".md"))
    for c in cmds:
        if f"/{c}" not in t: out.append(f"command /{c} is not in the tutorial")
    stripped = claude_only_stripped(t)
    for c in re.findall(r"/prism-[\w-]+", stripped): out.append(f"{c} is mentioned outside a claude-only section (ChatGPT has no commands)")
    # Formats and skills.
    cards = sorted(f[:-3] for f in os.listdir(os.path.join(PLUGIN, "skills", "prism-produce", "references", "formats")) if f.endswith(".md") and f[:-3] not in CARDS_NOT_FORMATS)
    skills = sorted(d for d in os.listdir(os.path.join(PLUGIN, "skills")) if os.path.isdir(os.path.join(PLUGIN, "skills", d)))
    for key in [f"format:{c}" for c in cards] + [f"skill:{s}" for s in skills]:
        if key not in PHRASES: out.append(f"{key} is new: add how the tutorial names it to PHRASES in tools/check-tutorial.py, and describe it in the tutorial"); continue
        for p in PHRASES[key]:
            if not has(p): out.append(f"{key}: the tutorial never says \"{p}\"")
    # Brands are listed at run time (core names none, tests/core-brand-free.test.py), so the tutorial must say how.
    if "run.sh brands" not in t: out.append("the tutorial must tell the presenter to list the brands with `run.sh brands`")
    # The reviewed stamp: one look per release (major.minor).
    if version:
        m = re.search(r"<!--\s*tutorial-reviewed:\s*([\d.]+)\s*-->", t)
        want = ".".join(version.split("-")[0].split(".")[:2])
        if not m: out.append("the tutorial has no <!-- tutorial-reviewed: X.Y --> stamp")
        elif m.group(1) != want: out.append(f"the tutorial was last reviewed for {m.group(1)}, this is {want}: read it against this release's changes, update it, then set the stamp to {want}")
    return out


if __name__ == "__main__":
    ver = sys.argv[1] if len(sys.argv) > 1 else open(os.path.join(PLUGIN, "skills", "prism-produce", "kit", "VERSION")).read().strip()
    p = problems(ver)
    for x in p: print("tutorial:", x)
    print("tutorial up to date" if not p else f"tutorial out of date: {len(p)} problem(s)")
    sys.exit(1 if p else 0)
