#!/usr/bin/env python3
"""Compares an edited wireframe artboard with the one the kit wrote and reports what the person changed:
blocks moved, removed or added, items reordered inside a row, every text edit (old -> new), and every link whose
address chip was changed or that was typed in as a new address.
With --apply NEW.md it also writes the format file with the blocks in their new order and removed blocks dropped;
text edits are left for the agent, which applies them through the content or layout lane.
Styling changed on the canvas (colours, sizes, fonts) is reported as NOT CARRIED: boards never carry styling back.
A board that can't be read back safely stops with exit 3 and changes nothing: one that lost its wireframe wrapper, or one
that would remove more than half the blocks (pass --confirm-removals once the person has said those cuts are meant).
Usage: wire_diff.py wire/<format>/ edited-<format>.dc.html [--apply formats/sheet.md] [--confirm-removals]
After --apply it runs vet.py --fix on the result; apply the EDITED lines, then run vet again with --was wire/source.md."""
import difflib, json, os, re, sys
from html.parser import HTMLParser

INLINE = {"b", "strong", "em", "i"}
VOID = {"br", "img", "hr", "input", "meta", "link", "source", "wbr", "area", "col", "embed", "param", "track"}


class Wire(HTMLParser):
    """Collects each data-block's text and its data-item children, in document order."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.blocks, self.cur, self.item, self.skip, self.in_root, self.loose, self.url = [], [], None, None, 0, False, [], None
        self.found_root = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in VOID:
            if tag == "br" and self.cur: self.cur["text"].append(" ")
            return
        mark = None
        if "data-wire-root" in a: self.in_root = self.found_root = True; mark = "root"
        elif "data-block" in a and self.in_root and self.cur is None:
            self.cur = {"id": a["data-block"], "text": [], "items": [], "links": [], "look": []}; mark = "block"
        elif "data-item" in a and self.cur is not None:
            self.item = {"id": a["data-item"], "text": []}; mark = "item"
        elif "data-wire-tag" in a: self.skip += 1; mark = "tag"
        # A link's address chip: kept apart from the block's text, compared on its own.
        elif "data-url" in a and self.cur is not None: self.url = []; mark = "url"
        elif self.in_root and self.cur is None and len([s for s in self.stack if s[1] == "root"]) and self.stack and self.stack[-1][1] == "root":
            self.cur = {"id": None, "text": [], "items": [], "links": [], "look": []}; mark = "block"
        # The block's look: every class and style inside it, so a restyle on the canvas can be reported as not carried.
        if self.cur is not None and tag not in INLINE and (a.get("class") or a.get("style")):
            self.cur["look"].append(look(a))
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
            elif mark == "url": self.cur["links"].append(norm("".join(self.url))); self.url = None
            elif mark == "root": self.in_root = False
            if t == tag: break

    def handle_data(self, d):
        if self.url is not None: self.url.append(d); return
        if self.skip or self.cur is None: return
        self.cur["text"].append(d)
        if self.item is not None: self.item["text"].append(d)


def norm(s): return re.sub(r"\s+", " ", s).strip()


def look(a):
    style = ";".join(sorted(d for d in re.sub(r"\s+", "", (a.get("style") or "").lower()).split(";") if d))
    return " ".join(sorted((a.get("class") or "").split())) + "|" + style


URL = re.compile(r"(?:https?://|mailto:|www\.)[^\s)\]]+")


def parse(path):
    w = Wire(); w.feed(open(path, encoding="utf8").read()); return w.blocks, w.found_root


def label(b, n=48):
    t = b["text"]; return f'"{t[:n]}{"…" if len(t) > n else ""}"'


def main():
    args = sys.argv[1:]
    wire_dir, edited = args[0], args[1]
    apply_to = args[args.index("--apply") + 1] if "--apply" in args else None
    snap = json.load(open(os.path.join(wire_dir, "wire.json"), encoding="utf8"))
    board = os.path.join(wire_dir, snap.get("board", "Main.dc.html"))
    (before, _), (after, rooted) = parse(board), parse(edited)
    # Without its wrapper a board reads as empty, and applying it would drop every block: stop before anything is written.
    if not rooted:
        print(f"STOP     the edited board has lost its wireframe wrapper (data-wire-root), so its edits can't be read back safely.\n"
              f"         Nothing was applied. Republish the last good board ({board}) and read the edits off the saved copy by eye.")
        sys.exit(3)
    old = {b["id"]: b for b in before}
    ided = {b["id"] for b in after if b["id"] in old}
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
        ol, al = o.get("links", []), b.get("links", [])
        for k in range(min(len(ol), len(al))):
            if ol[k] != al[k]: report.append(f"LINK     {b['id']} {label(b, 30)} link {k + 1}: {ol[k]} -> {al[k]}")
        for k in range(len(al), len(ol)): report.append(f"LINK     {b['id']} {label(o, 30)} link {k + 1} removed: {ol[k]}")
        # An address typed into the text (bare or as [text](address)) is a new link to add as Markdown.
        for u in sorted(set(URL.findall(b["text"])) - set(URL.findall(o["text"]))):
            report.append(f"LINK     {b['id']} {label(b, 30)} new address typed in: {u}")
        # Only blocks that kept their own id: one matched by its text was rebuilt by the editor, so its markup differs anyway.
        if b["id"] in ided and b["look"] != o["look"]:
            report.append(f"NOT CARRIED {b['id']} {label(b, 30)} styling changed on the canvas (colour, size, font or spacing); boards never carry styling: ask in chat for a layout change")
    print("\n".join(report) if report else "No changes.")
    # Most of the piece gone at once is far likelier a broken save than an edit: the person confirms before it is applied.
    if apply_to and len(before) >= 3 and len(removed) * 2 > len(before) and "--confirm-removals" not in args:
        print(f"STOP     {len(removed)} of {len(before)} blocks would be removed. Nothing was applied. Ask the person whether those cuts are meant;\n"
              f"         if they are, run again with --confirm-removals, else republish the last good board ({board}).")
        sys.exit(3)
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
