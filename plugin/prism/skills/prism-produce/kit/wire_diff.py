#!/usr/bin/env python3
"""Compares an edited wireframe artboard with the one the kit wrote and reports what the person changed:
blocks moved, removed or added, items reordered inside a row, and every text edit (old -> new).
With --apply NEW.md it also writes the format file with the blocks in their new order and removed blocks dropped;
text edits are left for the agent, which applies them through the content or layout lane.
Usage: wire_diff.py wire/<format>/ edited-<format>.dc.html [--apply formats/sheet.md]
After --apply it runs vet.py --fix on the result; apply the EDITED lines, then run vet again with --was wire/source.md."""
import difflib, json, os, re, sys
from html.parser import HTMLParser

VOID = {"br", "img", "hr", "input", "meta", "link", "source", "wbr", "area", "col", "embed", "param", "track"}


class Wire(HTMLParser):
    """Collects each data-block's text and its data-item children, in document order."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.blocks, self.cur, self.item, self.skip, self.in_root, self.loose = [], [], None, None, 0, False, []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in VOID:
            if tag == "br" and self.cur: self.cur["text"].append(" ")
            return
        mark = None
        if "data-wire-root" in a: self.in_root = True; mark = "root"
        elif "data-block" in a and self.in_root and self.cur is None:
            self.cur = {"id": a["data-block"], "text": [], "items": []}; mark = "block"
        elif "data-item" in a and self.cur is not None:
            self.item = {"id": a["data-item"], "text": []}; mark = "item"
        elif "data-wire-tag" in a: self.skip += 1; mark = "tag"
        elif self.in_root and self.cur is None and len([s for s in self.stack if s[1] == "root"]) and self.stack and self.stack[-1][1] == "root":
            self.cur = {"id": None, "text": [], "items": []}; mark = "block"
        if self.cur is not None and tag in ("p", "div", "li"):
            self.cur["text"].append(" ")
            if self.item is not None: self.item["text"].append(" ")
        if "data-icon" in a and self.cur is not None:
            self.cur["text"].append(f"[icon:{a['data-icon']}] ")
        self.stack.append((tag, mark))

    def handle_endtag(self, tag):
        while self.stack:
            t, mark = self.stack.pop()
            if mark == "block":
                self.cur["text"] = norm("".join(self.cur["text"])); self.blocks.append(self.cur); self.cur = None
            elif mark == "item":
                self.item["text"] = norm("".join(self.item["text"])); self.cur["items"].append(self.item); self.item = None
            elif mark == "tag": self.skip -= 1
            elif mark == "root": self.in_root = False
            if t == tag: break

    def handle_data(self, d):
        if self.skip or self.cur is None: return
        self.cur["text"].append(d)
        if self.item is not None: self.item["text"].append(d)


def norm(s): return re.sub(r"\s+", " ", s).strip()


def parse(path):
    w = Wire(); w.feed(open(path, encoding="utf8").read()); return w.blocks


def label(b, n=48):
    t = b["text"]; return f'"{t[:n]}{"…" if len(t) > n else ""}"'


def main():
    args = sys.argv[1:]
    wire_dir, edited = args[0], args[1]
    apply_to = args[args.index("--apply") + 1] if "--apply" in args else None
    snap = json.load(open(os.path.join(wire_dir, "wire.json"), encoding="utf8"))
    before, after = parse(os.path.join(wire_dir, snap.get("board", "Main.dc.html"))), parse(edited)
    old = {b["id"]: b for b in before}
    # Blocks the editor lost their id for are matched to the closest unmatched original by text.
    used = {b["id"] for b in after if b["id"] in old}
    for b in after:
        if b["id"] in old: continue
        best = max(((difflib.SequenceMatcher(None, b["text"], o["text"]).ratio(), o["id"]) for o in before if o["id"] not in used), default=(0, None))
        if best[0] > 0.6: b["id"] = best[1]; used.add(best[1])
    report = []
    order_before = [b["id"] for b in before]
    order_after = [b["id"] for b in after if b["id"]]
    removed = [i for i in order_before if i not in order_after]
    for i in removed: report.append(f"REMOVED  {i} {label(old[i])}")
    for b in after:
        if not b["id"]: report.append(f"ADDED    new block {label(b, 90)} (after {prev_id(after, b)})")
    kept_before = [i for i in order_before if i in order_after]
    if kept_before != order_after:
        sm = difflib.SequenceMatcher(None, kept_before, order_after)
        moved = set(order_after) - {kept_before[k] for blk in sm.get_matching_blocks() for k in range(blk.a, blk.a + blk.size)}
        for i in order_after:
            if i in moved:
                j = order_after.index(i)
                where = f"above {order_after[j + 1]} {label(old[order_after[j + 1]], 30)}" if j + 1 < len(order_after) else "to the end"
                report.append(f"MOVED    {i} {label(old[i], 40)} {where}")
    for b in after:
        if not b["id"] or b["id"] not in old: continue
        o = old[b["id"]]
        oi, ai = [x["id"] for x in o["items"]], [x["id"] for x in b["items"]]
        if oi and ai and oi != ai and sorted(oi) == sorted(ai):
            report.append(f"REORDER  {b['id']} items now {', '.join(x.split('.')[-1] for x in ai)} (was {', '.join(x.split('.')[-1] for x in oi)})")
        if oi and len(ai) < len(oi):
            gone = [x for x in o["items"] if x["id"] not in ai]
            for g in gone: report.append(f"REMOVED  item {g['id']} {label(g)}")
        if b["text"] != o["text"]:
            report.append(f"EDITED   {b['id']}\n  was: {o['text']}\n  now: {b['text']}")
    print("\n".join(report) if report else "No changes.")
    if apply_to:
        mdmap = {x["id"]: x["md"] for x in snap["blocks"]}
        parts = [mdmap[i] for i in order_after if i in mdmap]
        if snap.get("wrapOpen"): parts = [snap["wrapOpen"]] + parts + [snap["wrapClose"]]
        parts += [h["md"] for h in snap["hidden"]]
        open(apply_to, "w", encoding="utf8").write(snap["frontMatter"] + "\n" + "\n\n".join(parts) + "\n")
        print(f"wrote {apply_to}: blocks in the new order, removed blocks dropped; apply the EDITED lines yourself")
        # Vet the result straight away: numbering after a move, headings split from their text, notes, doubled words.
        base = os.path.join(wire_dir, "source.md")
        open(base, "w", encoding="utf8").write(snap["frontMatter"] + "\n" + "\n\n".join(([snap["wrapOpen"]] if snap.get("wrapOpen") else []) + [x["md"] for x in snap["blocks"]] + ([snap["wrapClose"]] if snap.get("wrapClose") else [])))
        print("\n-- vet --", flush=True)
        os.system(f'python3 "{os.path.join(os.path.dirname(os.path.abspath(__file__)), "vet.py")}" "{apply_to}" --fix')


def prev_id(blocks, b):
    k = blocks.index(b)
    for p in reversed(blocks[:k]):
        if p["id"]: return p["id"]
    return "the start"


main()
