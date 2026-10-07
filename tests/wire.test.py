#!/usr/bin/env python3
"""Design mode (0.16): boards, the canvas index, icons, links, brand lo-fi, the edit read-back and design state.
Usage: python3 tests/wire.test.py   (needs node, pandoc and the kit's Chromium; run.sh sets it up on first use)"""
import json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit")
FIX = os.path.join(ROOT, "fixtures")
fails, n = [], 0


def check(name, ok, detail=""):
    global n
    n += 1
    if not ok: fails.append(f"{name}: {str(detail)[:300]}")


def run(*a, cwd=None):
    return subprocess.run(["bash", os.path.join(KIT, "run.sh"), *a], capture_output=True, text=True, cwd=cwd)


tmp = tempfile.mkdtemp(prefix="prism-wire-")
try:
    names = ["sheet-paperwork-brief", "brochure", "deck", "social", "carousel", "stories", "email", "html-email-newsletter", "blog"]
    shutil.copytree(FIX, os.path.join(tmp, "fixtures"))
    r = run("wire", *[f"fixtures/{x}.md" for x in names], "--out", "wire", "--canvas", "wire/canvas", "--title", "Test design", cwd=tmp)
    check("one command builds every board", r.returncode == 0, r.stderr)
    pub = [l for l in r.stdout.splitlines() if l.startswith("publish: ")]
    check("prints a publish line", len(pub) == 1, r.stdout[-400:])
    P = json.loads(pub[0][9:]) if pub else {}
    check("publish sends the index first and every board", P.get("file_path", "").endswith("project/canvas.json") and len(P.get("files", {})) == len(names), P)

    idx = json.load(open(os.path.join(tmp, "wire/canvas/project/canvas.json")))
    check("index has createdOnFiles", idx.get("createdOnFiles", {}).get("v") == 1 and idx["createdOnFiles"].get("at", "").endswith("Z"), idx.get("createdOnFiles"))
    check("index lists every board in order", idx["order"] == [f"{x}.dc.html" for x in names], idx["order"])
    xs = [idx["boards"][f"{x}.dc.html"] for x in names]
    check("boards 80 px apart in a row", all(b["x"] == a["x"] + a["w"] + 80 and b["y"] == 0 for a, b in zip(xs, xs[1:])), xs[:3])
    check("index keeps the how-to note", "howto" in idx["notes"], idx["notes"])

    for x in names:
        h = open(os.path.join(tmp, f"wire/{x}/{x}.dc.html")).read()
        snap = json.load(open(os.path.join(tmp, f"wire/{x}/wire.json")))
        check(f"{x}: keeps the support.js line", '<script src="./support.js"></script>' in h)
        check(f"{x}: no tag carries two style attributes", not re.search(r"<[^>]*\sstyle=\"[^\"]*\"[^>]*\sstyle=", h), re.search(r"<[^>]*\sstyle=\"[^\"]*\"[^>]*\sstyle=[^>]*>", h))
        check(f"{x}: $preview matches the board", f'"$preview":{{"width":{snap["size"]["w"]},"height":{snap["size"]["h"]}}}' in h)
        check(f"{x}: no fractional grid tracks", not re.search(r"repeat\(\d+\.\d+", h), re.findall(r"repeat\([^)]*\)", h)[:3])
        check(f"{x}: board identical in the canvas folder", open(os.path.join(tmp, f"wire/canvas/project/{x}.dc.html")).read() == h)
        check(f"{x}: boards stay small", len(h) < 24000, len(h))
    sheet = open(os.path.join(tmp, "wire/sheet-paperwork-brief/sheet-paperwork-brief.dc.html")).read()
    check("icons drawn from the brand's Phosphor set", re.search(r'data-icon="sparkle" class="wic"><svg viewBox="0 0 1024 1024"', sheet), re.findall(r'data-icon="[^"]*"[^>]*>', sheet)[:2])
    check("component guides are labelled chips, not cards", 'class="wb"' in sheet and 'class="wt"' in sheet and ".wb{" in sheet and "dashed #7DA2D6" in sheet)
    check("Case Amplify headings carry the lo-fi wave", sheet.count('stroke="#9A9AA2"') >= 3)
    check("Case Amplify closing card in lo-fi", 'class="wb ca-dark"' in sheet)
    mail = open(os.path.join(tmp, "wire/html-email-newsletter/html-email-newsletter.dc.html")).read()
    check("links show their address chip", '<span data-url="" class="wurl">https://caseamplify.com/demo</span>' in mail)
    check("merge tags survive in links", 'href="*|UNSUB|*"' in mail and ">*|UNSUB|*</span>" in mail, re.findall(r"UNSUB[^<]{0,20}", mail))

    # Prism brand: numbered sections with the rule below, and its closing card.
    src = open(os.path.join(tmp, "fixtures/sheet-paperwork-brief.md")).read().replace("---\n", "---\nbrand: prism\n", 1)
    open(os.path.join(tmp, "fixtures/prism-sheet.md"), "w").write(src)
    r = run("wire", "fixtures/prism-sheet.md", "wire/prism-sheet", cwd=tmp)
    ph = open(os.path.join(tmp, "wire/prism-sheet/prism-sheet.dc.html")).read() if r.returncode == 0 else ""
    check("Prism lo-fi headings are numbered", '<span class="pr-num">01</span>' in ph and '<span class="pr-num">02</span>' in ph, r.stderr)
    check("Prism closing card in lo-fi", 'class="wb pr-close"' in ph)

    # A second run keeps the index's positions and notes, and sends it only when something changed.
    ip = os.path.join(tmp, "wire/canvas/project/canvas.json")
    idx["boards"]["deck.dc.html"]["x"] = 99999; idx["notes"]["mine"] = {"x": 0, "y": -300, "text": "kept"}
    json.dump(idx, open(ip, "w"), indent=1)
    pubof = lambda r: json.loads([l for l in r.stdout.splitlines() if l.startswith("publish: ")][0][9:])
    r = run("wire", "fixtures/deck.md", "--out", "wire", "--canvas", "wire/canvas", cwd=tmp)
    P2 = pubof(r)
    check("same size: index not sent", P2["file_path"].endswith("deck.dc.html") and not P2["files"], P2)
    r = run("wire", "fixtures/deck.md", "--out", "wire", "--canvas", "wire/canvas", "--stamp", "Exported v2 · test", cwd=tmp)
    idx2 = json.load(open(ip))
    check("person's board position kept", idx2["boards"]["deck.dc.html"]["x"] == 99999, idx2["boards"]["deck.dc.html"])
    check("person's note kept", idx2["notes"].get("mine", {}).get("text") == "kept")
    check("new size: index sent with the board", pubof(r)["file_path"].endswith("canvas.json"), pubof(r))
    deck = open(os.path.join(tmp, "wire/deck/deck.dc.html")).read()
    check("export stamp on the board, outside the diff", '<span class="wstamp">Exported v2 · test</span>' in deck and 'data-wire-tag="" class="wfull"' in deck)

    # Edit read-back: a move, a text edit, a retyped link address and a typed-in address.
    w = os.path.join(tmp, "wire/html-email-newsletter")
    e = mail.replace(">https://caseamplify.com/demo<", ">https://caseamplify.com/book<").replace("here is what changed this month.", "here is what changed this month. See www.caseamplify.com/news.")
    blk = re.search(r'<div data-block="b05".*?\n', e).group(0); e = e.replace(blk, "").replace('<div data-block="b00"', blk.rstrip("\n") + '<div data-block="b00"', 1)
    open(os.path.join(tmp, "edited.dc.html"), "w").write(e)
    r = subprocess.run([sys.executable, os.path.join(KIT, "wire_diff.py"), w, os.path.join(tmp, "edited.dc.html")], capture_output=True, text=True)
    out = r.stdout
    check("diff: move", "MOVED    b05" in out, out)
    check("diff: text edit, without the chips", "EDITED   b01" in out and "caseamplify.com/demo" not in out.split("EDITED")[1].split("LINK")[0], out)
    check("diff: retyped address", "link 1: https://caseamplify.com/demo -> https://caseamplify.com/book" in out, out)
    check("diff: typed-in address", "new address typed in: www.caseamplify.com/news" in out, out)
    r = subprocess.run([sys.executable, os.path.join(KIT, "wire_diff.py"), w, os.path.join(w, "html-email-newsletter.dc.html")], capture_output=True, text=True)
    check("diff: an untouched board has no changes", r.stdout.strip() == "No changes.", r.stdout)
    check("diff: moves and text edits are not styling", "NOT CARRIED" not in out, out)

    # Safe read-back: a restyle is reported, a broken save or mass cut stops before the format file is touched.
    diff = lambda board, *a: subprocess.run([sys.executable, os.path.join(KIT, "wire_diff.py"), w, board, *a], capture_output=True, text=True)
    fmt = os.path.join(tmp, "fixtures/html-email-newsletter.md"); orig = open(fmt).read()
    first = re.search(r'<div data-block="b01".*?\n', mail).group(0)
    styled = first.replace('class="', 'style="color: red" class="', 1)
    open(os.path.join(tmp, "styled.dc.html"), "w").write(mail.replace(first, styled))
    r = diff(os.path.join(tmp, "styled.dc.html"))
    check("diff: a restyle is reported as not carried", "NOT CARRIED b01" in r.stdout and "EDITED" not in r.stdout, r.stdout)
    open(os.path.join(tmp, "unwrapped.dc.html"), "w").write(mail.replace("data-wire-root", "data-gone"))
    r = diff(os.path.join(tmp, "unwrapped.dc.html"), "--apply", fmt)
    check("diff: a board without its wrapper stops", r.returncode == 3 and r.stdout.startswith("STOP") and open(fmt).read() == orig, (r.returncode, r.stdout[:200]))
    lines = [l for l in mail.split("\n") if re.search(r'<div data-block="b\d+"', l)]
    gutted = mail
    for l in lines[1:]: gutted = gutted.replace(l + "\n", "")
    open(os.path.join(tmp, "gutted.dc.html"), "w").write(gutted)
    r = diff(os.path.join(tmp, "gutted.dc.html"), "--apply", fmt)
    check("diff: removing most blocks stops for a confirmation", r.returncode == 3 and "blocks would be removed" in r.stdout and open(fmt).read() == orig, (r.returncode, r.stdout[-300:]))
    r = diff(os.path.join(tmp, "gutted.dc.html"), "--apply", fmt, "--confirm-removals")
    check("diff: confirmed removals are applied", r.returncode == 0 and open(fmt).read() != orig, (r.returncode, r.stdout[-300:]))
    open(fmt, "w").write(orig)

    # Design state: canvas version, pull check, export record, pending changes.
    p = os.path.join(tmp, "piece"); os.makedirs(os.path.join(p, "formats")); os.makedirs(os.path.join(p, "wire", "sheet"))
    open(os.path.join(p, "content.md"), "w").write('---\ntitle: X\nversion: 3\nchanges:\n  - "v2 · canvas: moved"\n  - "v3 · chat: reworded"\n---\nBody\n')
    open(os.path.join(p, "formats/sheet.md"), "w").write("a\n"); open(os.path.join(p, "wire/sheet/wire.json"), "w").write("{}")
    st = lambda *a: run("state", p, *a).stdout
    check("state: nothing yet", "design mode not opened" in st("show"))
    st("canvas", "--url", "https://claude.ai/artifact/X", "--version", "1791305898-aae5")
    check("state: same second is the same save", st("pull-needed", "--version", "1791305898-c83e").startswith("skip"))
    check("state: a later save needs a pull", st("pull-needed", "--version", "1791305960-0001").startswith("pull"))
    check("state: export recorded", "export recorded: sheet at content v3" in st("export", "sheet", os.path.join(p, "formats/sheet.md")))
    open(os.path.join(p, "content.md"), "w").write('---\ntitle: X\nversion: 4\nchanges:\n  - "v3 · chat: reworded"\n  - "v4 · canvas: cut slide 2"\n---\nBody\n')
    open(os.path.join(p, "formats/sheet.md"), "w").write("b\n")
    j = json.loads(st("show", "--json"))
    check("state: exported session", j["session"] == "exported", j)
    check("state: pending since the export", j["formats"]["sheet"]["pending"] == ["v4 · canvas: cut slide 2"] and j["formats"]["sheet"]["format_file_changed"] is True, j["formats"])
    check("state: board snapshot kept", os.path.exists(os.path.join(p, ".prism/exports/sheet/v3/wire.json")))

    # Co-op: owner and invitees, an exact pull check once others can save, the canvas owner note, the Exports page.
    check("co-op: invite needs an owner", run("state", p, "invite", "Dana").returncode == 2)
    st("coop", "--owner", "Ian", "--doc", "https://claude.ai/artifact/D")
    check("co-op: invitees recorded once", st("invite", "@Dana", "Lee", "dana").strip() == "invitees: Dana, Lee", st("show"))
    check("co-op: show names them", "co-op: owner Ian · invitees Dana, Lee · doc https://claude.ai/artifact/D" in st("show"))
    st("canvas", "--version", "1791305898-aae5")
    check("co-op: same second is not enough", st("pull-needed", "--version", "1791305898-c83e").startswith("pull"))
    check("co-op: the exact version still skips", st("pull-needed", "--version", "1791305898-aae5").startswith("skip"))
    st("invite", "Dana", "Lee", "--remove")
    check("co-op: removed invitees bring the grace back", st("pull-needed", "--version", "1791305898-c83e").startswith("skip"))
    r = run("wire", "fixtures/deck.md", "--out", "wire", "--canvas", "wire/canvas", "--owner", "Ian", cwd=tmp)
    note = json.load(open(ip))["notes"].get("coop", {})
    check("co-op: owner note on the canvas, index sent", "Ian's Prism makes the changes" in note.get("text", "") and pubof(r)["file_path"].endswith("canvas.json"), (note, r.stderr))
    os.makedirs(os.path.join(p, "out"))
    open(os.path.join(p, "out/x-sheet-v4.pdf"), "wb").write(b"%PDF-1.4 test")
    open(os.path.join(p, "out/x-deck-v4.pptx"), "wb").write(b"PK test")
    with open(os.path.join(p, "out/x-big.zip"), "wb") as f: f.truncate(16 * 1024 * 1024)
    st("export", "sheet", os.path.join(p, "out/x-sheet-v4.pdf")); st("export", "deck", os.path.join(p, "out/x-deck-v4.pptx"))
    r = run("exports", p, "--out", os.path.join(p, "exports"), "--title", "Test piece", "--add", os.path.join(p, "out/x-big.zip"))
    pe = [l for l in r.stdout.splitlines() if l.startswith("publish: ")]
    E = json.loads(pe[0][9:]) if pe else {}
    page = open(E["file_path"]).read() if E else ""
    check("exports: page and publish line", r.returncode == 0 and set(E.get("files", {})) == {"files/x-sheet-v4.pdf", "files/x-deck-v4.pptx"}, r.stdout + r.stderr)
    check("exports: a deck keeps its type", E.get("files", {}).get("files/x-deck-v4.pptx", {}).get("contentType", "").endswith("presentationml.presentation"), E)
    check("exports: too-large files are listed, not hosted", "too large to host here" in page and "x-big.zip" in r.stdout, r.stdout)
    check("exports: titled and versioned", "<title>Test piece files</title>" in page and "v4 · " in page and "by Ian" in page, page[:400])
finally:
    shutil.rmtree(tmp, ignore_errors=True)

for f in fails: print("FAIL", f)
print(f"{n - len(fails)}/{n} checks passed")
sys.exit(1 if fails else 0)
