#!/usr/bin/env python3
"""Checks a format or content file for the mistakes people make while editing, so they are fixed before a build.
Finds: numbered headings out of sequence, a count in a heading that no longer matches ("Four findings" over three),
headings with no text under them, doubled words, stray spaces, notes addressed to the editor, unbalanced * or **,
em dashes and hype words. --fix renumbers headings and cleans spacing and doubled words in place.
With a previous version it also lists every changed passage word by word, so the agent proofreads exactly what changed.
Usage: vet.py FILE.md [--was OLD.md] [--fix]"""
import difflib, re, sys

COUNTS = {w: i for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve".split())}
HYPE = r"\b(seamless(ly)?|game[- ]changer|unlock(s|ing)?|cutting[- ]edge|robust|revolutionary)\b"
NOTE = r"(\bTODO\b|\bTBD\b|\bFIXME\b|\bXX+\b|lorem ipsum|\[placeholder\]|delete (me|this)|remove (me|this)|\bnote to (self|editor)\b|\[\[.*?\]\]|<<.*?>>)"


def body(lines):
    """Yields (line number, text) for prose lines, skipping front matter, code fences, fenced div markers and footnotes."""
    fm = lines and lines[0].strip() == "---"
    code = False
    for n, l in enumerate(lines):
        if fm:
            if n > 0 and l.strip() == "---": fm = False
            continue
        if l.lstrip().startswith("```"): code = not code; continue
        if code or l.startswith(":::") or l.startswith("[^"): continue
        yield n, l


def fm_end(lines):
    """Index of the line closing the front matter, or -1."""
    if not lines or lines[0].strip() != "---": return -1
    return next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), -1)


def heading(l):
    m = re.match(r"^(#{1,6})\s+(.*)$", l)
    return (len(m.group(1)), m.group(2)) if m else None


def vet(lines, fix):
    out, heads = [], [(n, *h) for n, l in body(lines) if (h := heading(l))]
    # Numbered headings: consecutive runs at one level under the same parent must count up from the first number.
    run, parent = [], None
    def close(run):
        if len(run) < 2: return
        start = min(r[2] for r in run)  # the lowest number starts the run, so a moved first item still counts from it
        for k, (n, lvl, num, rest) in enumerate(run):
            want = start + k
            if num != want:
                out.append(f"FIXED    line {n+1}: heading number {num} -> {want} ({rest[:50]})" if fix else f"NUMBER   line {n+1}: heading is {num}, sequence says {want} ({rest[:50]})")
                if fix: lines[n] = re.sub(r"^(#{1,6}\s+)\d+", lambda m: m.group(1) + str(want), lines[n])
    for n, lvl, text in heads:
        m = re.match(r"^(\d+)\.\s+(.*)", text)
        if m and (not run or (run[-1][1] == lvl and parent == prev_parent(heads, n, lvl))):
            if not run: parent = prev_parent(heads, n, lvl)
            run.append((n, lvl, int(m.group(1)), m.group(2)))
        elif m:
            close(run); run = [(n, lvl, int(m.group(1)), m.group(2))]; parent = prev_parent(heads, n, lvl)
        elif run and lvl <= run[0][1]:
            close(run); run = []
    close(run)
    # Frame counters (note="02 / 07") and point numbers ([01]{.num}) must count up in order after panels move.
    for pat, name in ((r'note="(\d+) / (\d+)"', "counter"), (r"\[(\d+)(?=[\]\s·])", "point number")):
        hits = [(n, m) for n, l in enumerate(lines) if n > fm_end(lines) for m in re.finditer(pat, l)]
        if len(hits) < 2: continue
        start, width = min(int(m.group(1)) for _, m in hits), len(hits[0][1].group(1))
        total = start + len(hits) - 1
        for k, (n, m) in enumerate(hits):
            want = str(start + k).zfill(width)
            new = f'note="{want} / {str(total).zfill(len(m.group(2)))}"' if name == "counter" else "[" + want
            if m.group(0) != new:
                out.append(f"FIXED    line {n+1}: {name} {m.group(0)} -> {new}" if fix else f"NUMBER   line {n+1}: {name} {m.group(0)}, sequence says {new}")
                if fix: lines[n] = lines[n].replace(m.group(0), new, 1)
    # A count word in a heading ("Four findings") must match the numbered subheadings under it.
    for i, (n, lvl, text) in enumerate(heads):
        w = re.match(r"^(\w+)\b", re.sub(r"[*_]", "", text).lower())
        if not w or w.group(1) not in COUNTS: continue
        kids = []
        for m_, l2, t2 in heads[i + 1:]:
            if l2 <= lvl: break
            if l2 == lvl + 1 and re.match(r"^\d+\.\s", t2): kids.append(t2)
        if kids and len(kids) != COUNTS[w.group(1)]:
            out.append(f"COUNT    line {n+1}: \"{text}\" but {len(kids)} numbered items follow")
    # A heading followed straight by another heading at the same or a higher level has lost its text.
    prose = [(n, l) for n, l in body(lines) if l.strip()]
    for k, (n, l) in enumerate(prose[:-1]):
        h, h2 = heading(l), heading(prose[k + 1][1])
        if h and h2 and h2[0] <= h[0] and h[0] >= 3:
            out.append(f"EMPTY    line {n+1}: \"{h[1][:50]}\" has no text under it (moved away from its paragraph?)")
    for n, l in body(lines):
        if not l.strip(): continue
        t = re.sub(r"\[\^\w+\]|\(https?://\S+\)", "", l)
        for m in re.finditer(r"\b(\w+)\s+\1\b", t, re.I):
            if m.group(1).isdigit(): continue
            out.append(f"FIXED    line {n+1}: doubled word \"{m.group(0)}\"" if fix else f"DOUBLED  line {n+1}: \"{m.group(0)}\"")
            if fix: lines[n] = re.sub(r"\b(" + re.escape(m.group(1)) + r")\s+\1\b", r"\1", lines[n], count=1, flags=re.I)
        if re.search(r"\S  +\S|\s+[.,;:!?](\s|$)", l.rstrip()) and not l.startswith("|"):
            out.append(f"FIXED    line {n+1}: stray spaces" if fix else f"SPACING  line {n+1}: stray spaces")
            if fix: lines[n] = re.sub(r"(?<=\S)  +(?=\S)", " ", re.sub(r"\s+([.,;:!?])(?=\s|$)", r"\1", lines[n].rstrip()))
        if (m := re.search(NOTE, re.sub(r"!\[[^\]]*\]\([^)]*\)", "", l), re.I)):
            s = next((x for x in re.split(r"(?<=[.!?])\S*\s+", l) if m.group(0) in x), l).strip()
            out.append(f"NOTE     line {n+1}: reads like a note to the editor, not copy: {s[:90]}")
        if "—" in l: out.append(f"DASH     line {n+1}: em dash (brand rule: none)")
        if re.search(HYPE, l, re.I): out.append(f"HYPE     line {n+1}: {re.search(HYPE, l, re.I).group(0)} (brand rule)")
        bare = re.sub(r"\*\*", "", l)
        if l.count("**") % 2 or (bare.count("*") % 2 and not re.match(r"^\s*\* ", l)):
            out.append(f"MARKUP   line {n+1}: unbalanced * or ** (bold or accent word will break)")
    return out


def prev_parent(heads, n, lvl):
    p = None
    for m, l, t in heads:
        if m >= n: break
        if l < lvl: p = m
    return p


def changed(old, new):
    """Word-level list of what changed between two versions, one passage per line."""
    out = []
    keep = lambda ls: " ".join(l for l in ls if not l.startswith(":::")).split()
    a, b = keep(old), keep(new)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal": continue
        ctx = " ".join(b[max(0, j1 - 4):j1])
        out.append(f"CHANGED  …{ctx} [{' '.join(a[i1:i2]) or '+'} -> {' '.join(b[j1:j2]) or 'cut'}]")
    return out


def main():
    a = sys.argv[1:]
    path, fix = a[0], "--fix" in a
    was = a[a.index("--was") + 1] if "--was" in a else None
    lines = open(path, encoding="utf8").read().split("\n")
    rep = vet(lines, fix)
    if was: rep = changed(open(was, encoding="utf8").read().split("\n"), lines) + rep
    if fix: open(path, "w", encoding="utf8").write("\n".join(lines))
    try: print("\n".join(rep) if rep else "vet: nothing found")
    except BrokenPipeError: pass
    print("Proofread every CHANGED passage yourself for spelling, grammar and meaning; the tool only catches patterns.")


main()
