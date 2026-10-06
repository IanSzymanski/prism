# Design mode: the wireframe canvas in Claude Design (Claude only; not in quick mode)

Every format opens as a plain wireframe on a Claude Design canvas as soon as its format file exists: the real words in their blocks, rough spacing, no styling. Sheets, briefs and blogs flow as one page. Slides, posts, stories, emails, carousel panels and brochure panels are drawn as frames at their real proportions, with speaker notes and captions shown under each frame. An HTML email is one 600 px column with its subject and preheader in an inbox block at the top (edits there are `EDITED meta.inbox`: apply them to the front matter); buttons show as outlined labels and cards move as items of their row. The person edits on the canvas (retypes text, drags blocks or whole slides into a new order, deletes, adds a line) or describes changes in chat. You read the edits back, vet them, route them through the content and layout lanes, and rebuild with the kit. The canvas never produces the deliverable and its styling is never carried over.

## Open the canvas (step 1b of the skill: opens on its own before the first build)

1. For each format file: `.prism-kit/run.sh wire formats/<format>.md wire/<format>/`. It writes `wire/<format>/<format>.dc.html` (the board) and `wire.json` (the snapshot the diff needs), and prints the board size. Keep both; never edit them by hand.
2. Create one canvas for the piece from the Design artifact type (the Artifact tool's quickstart with intent "design" gives its link), titled "<piece title> design". Follow the type's instructions to write `project/canvas.json` and every `project/<format>.dc.html` (copies of the wire boards) in one publish. In `canvas.json`: one board per format, left to right at `y 0`, each `x` = the previous board's `x` + its `w` + 160, with the `w` and `h` the wire command printed. Add one sticky note after the last board: "Design mode: real words, rough spacing, no styling. Edit text in place, drag blocks or slides into a new order, delete what should go. Tell Claude "done" and the changes go back into the Markdown, get checked for typos and numbering, and the branded files rebuild." No design system: a wireframe is deliberately unstyled. Shape:
   ```json
   {"v": 3, "title": "<piece title> design", "launch": {"view": "canvas"}, "pages": [], "designSystems": [],
    "boards": {"sheet.dc.html": {"x": 0, "y": 0, "w": 816, "h": 3180, "title": "<piece> · sheet"},
               "deck.dc.html": {"x": 976, "y": 0, "w": 960, "h": 5094, "title": "<piece> · deck"}},
    "order": ["sheet.dc.html", "deck.dc.html"],
    "notes": {"howto": {"x": 2096, "y": 0, "w": 420, "fill": "purple", "text": "..."}}}
   ```
3. Tell the person in one line that design mode is open and that nothing is built until they say "done". Record the canvas link in log.md. From here the "Design session" rules in the prism-produce skill apply: every chat request starts with a pull of the canvas, changes are recorded in content.md's `changes:` list, the canvas is republished and reopened, and no file is built until "done".
4. A format added later ("also make a carousel") gets its own board on the same canvas: publish its `.dc.html` and the updated `canvas.json`.

## Read the edits back (every chat request during the session, and "done")

1. Read each board from the canvas (the Artifact tool's read with `path` `project/<format>.dc.html`); it saves the file locally. Read only the boards for formats the person touched when they say which; otherwise read all.
2. Per format: `.prism-kit/run.sh wire-diff wire/<format>/ <saved file> --apply formats/<format>.md`. It prints every change, rewrites the format file with blocks in their new order and removed blocks dropped, then runs `vet --fix` on it:
   - `MOVED` and `REMOVED`: already applied. On frame formats a block is a whole slide, post or panel.
   - `REORDER` items: blocks moved inside one row, slide or post. Reorder those lines in the format file.
   - `EDITED`: a wording change. Content lane: content.md first, then every format file that carries it; number check; run the reviewer if a number, quote or claim changed. Then use judgment the wireframe can't show: an icon that fits a card's new title, an accent word kept in a rewritten heading, a stat label shortened, text that no longer fits its slide.
   - `ADDED`: a new line or block. Put it in content.md and the format file as the component that fits.
   - The vet renumbers numbered headings, carousel and story counters (`note="02 / 07"`) and point numbers (`[01]{.num}`) to their new order, and reports headings left without their text, count headings that no longer match, notes to the editor and doubled words.
3. Keep fixed frames where they belong: a deck's title slide first and closing slide last, a carousel's cover first and `.end` panel last, a brochure's flap, back and cover in slots 1–3. If the person moved one of these, say so under "Needs your call" rather than building a broken piece. After carousel panels move, re-space the `burst` values so the wave still reads as one line.
4. Vet the edits ("Vet every edit" in the prism-produce skill): `run.sh vet formats/<format>.md --was wire/<format>/source.md --fix`, proofread every `CHANGED` passage, fix what is safe, leave out notes to the editor.
5. Record the round in content.md's `changes:` list, with each line marked `canvas`, `chat` or `fixed`.
6. Mid-session: apply the chat request, run `run.sh wire` again for the changed formats, publish their new `.dc.html` files (and `canvas.json` if a size changed) to the same canvas, open it, and read back. No build.
7. On "done": rebuild, run every check, deliver, and read back the whole session from the `changes:` list. Mention any styling the person tried on the canvas that the kit ignored.
