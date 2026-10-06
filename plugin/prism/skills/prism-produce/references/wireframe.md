# Design mode: the wireframe canvas in Claude Design (Claude only; not in quick mode)

Every format opens as a wireframe on a Claude Design canvas as soon as its format file exists: the real words in their blocks, rough spacing, the real icons, the brand's components in lo-fi greys (its section rule, closing card, divider), photos when they have been uploaded, and each link's address in a blue chip after its text. Sheets, briefs and blogs flow as one page. Slides, posts, stories, emails, carousel panels and brochure panels are drawn as frames at their real proportions, with speaker notes and captions shown under each frame. Component outlines are blue dashed guides with a label chip; they are never exported. An HTML email is one 600 px column with its subject and preheader in an inbox block at the top (edits there are `EDITED meta.inbox`: apply them to the front matter); buttons show as outlined labels with their address chip, and cards move as items of their row. The person edits on the canvas (retypes text or a link's address, drags blocks or whole slides into a new order, deletes, adds a line) or describes changes in chat. You read the edits back, vet them, route them through the content and layout lanes, and export with the kit. The canvas never produces the deliverable and its styling is never carried over.

State lives in the project: `.prism-kit/run.sh state <slug> ...` keeps the canvas link and the version last published or pulled, every format's last export (with a snapshot of its board), and what changed since, from content.md's `changes:` list. `state <slug> show` prints it; a later session starts there.

## Open the canvas (step 1b of the skill: opens on its own before the first build)

1. **Photos** (only when the piece has its own photos, not placeholders): if the canvas does not exist yet, create it first (step 2), then upload every file in `images/` that a format file uses in one call (the Artifact tool's publish with the canvas `url`, `asset: true` and `file_paths`), and write `wire/assets.json`, each image path as the format files write it mapped to the `url` the upload returned: `{"images/visit.jpg": "/_blob/…"}`. Boards then show the photos, cropped around their focal points. Skip this when there are no photos: grey boxes are fine.
2. **Create the canvas** once per piece: the Artifact tool's quickstart with intent "design" gives the Design type's link; publish with that `type_url`, the title "<piece title> design" and `auto_open: "after_first_write"`. Record its link: `state <slug> canvas --url <link>`.
3. **Build every board in one command** (one browser for all of them):
   ```bash
   .prism-kit/run.sh wire formats/sheet.md formats/deck.md --out wire --canvas wire/canvas --title "<piece title> design"
   ```
   It writes `wire/<format>/<format>.dc.html` and `wire.json` (the snapshot the diff needs) for each format, `wire/canvas/project/` with every board and `canvas.json` (boards left to right, the how-to note, `createdOnFiles`), and prints a `publish:` line. Never edit these files by hand.
4. **Publish in one call** with exactly what the `publish:` line gives (`root`, `file_path`, `files`) and the canvas `url`. Then record the version the publish result names: `state <slug> canvas --version <version id>`.
5. Tell the person in one line that design mode is open and that "done" exports the files. From here the "Design session" rules in the prism-produce skill apply.
6. A format added later ("also make a carousel"): the same wire command for that format with `--canvas wire/canvas`; it adds the board to the index and its `publish:` line sends both.

## Read the edits back (every chat request during the session, and "done")

1. **Is a pull needed?** List the canvas's files (the Artifact tool's list with the canvas `url` and `scope: "files"`; it is short and names the current version), then `state <slug> pull-needed --version <that version id>`. `skip` means nobody saved the canvas since your last publish or pull: go straight to the request. `pull` means read the boards.
2. Read each board from the canvas in one call (the Artifact tool's read with `paths`, one `project/<format>.dc.html` each); it saves the files locally. Read only the boards for formats the person touched when they say which. Record the version you read: `state <slug> canvas --version <id>`.
3. Per format: `.prism-kit/run.sh wire-diff wire/<format>/ <saved file> --apply formats/<format>.md`. It prints every change, rewrites the format file with blocks in their new order and removed blocks dropped, then runs `vet --fix` on it:
   - `MOVED` and `REMOVED`: already applied. On frame formats a block is a whole slide, post or panel.
   - `REORDER` items: blocks moved inside one row, slide or post. Reorder those lines in the format file.
   - `EDITED`: a wording change. Content lane: content.md first, then every format file that carries it; number check; run the reviewer if a number, quote or claim changed. Then use judgment the wireframe can't show: an icon that fits a card's new title, an accent word kept in a rewritten heading, a stat label shortened, text that no longer fits its slide.
   - `LINK`: an address retyped in its chip (`old -> new`), removed, or typed into the text as a new address. Change the link in content.md and every format file that carries it (a link is content). A new address typed into a sentence becomes a Markdown link on the words it belongs to; when that is unclear, ask under "Needs your call".
   - `ADDED`: a new line or block. Put it in content.md and the format file as the component that fits.
   - The vet renumbers numbered headings, carousel and story counters (`note="02 / 07"`) and point numbers (`[01]{.num}`) to their new order, and reports headings left without their text, count headings that no longer match, notes to the editor and doubled words.
4. Keep fixed frames where they belong: a deck's title slide first and closing slide last, a carousel's cover first and `.end` panel last, a brochure's flap, back and cover in slots 1–3. If the person moved one of these, say so under "Needs your call" rather than building a broken piece. After carousel panels move, re-space the `burst` values so the wave still reads as one line.
5. Vet the edits ("Vet every edit" in the prism-produce skill): `run.sh vet formats/<format>.md --was wire/<format>/source.md --fix`, proofread every `CHANGED` passage, fix what is safe, leave out notes to the editor.
6. Record the round in content.md's `changes:` list, with each line marked `canvas`, `chat` or `fixed`.

## Republish the boards

After any change, run the wire command again for the changed formats (with `--canvas wire/canvas`) and publish what its `publish:` line names; `canvas.json` goes only when the line says the index changed (a new board or a new size). Before sending a changed index, read `project/canvas.json` from the canvas into `wire/canvas/project/` first, so the person's own moves and notes on the canvas are kept. Record the published version with `state <slug> canvas --version`.

## Export ("done", and every change after it)

1. A last pull (step 1 above decides whether one is needed) and vet, then build, check and verify every format (step 2 of the skill) and deliver (step 3).
2. For each delivered format: `state <slug> export <format> <the delivered files>`.
3. Bring the canvas in line with what was delivered: run the wire command for every exported format with `--stamp "Exported v<content version> · <date>"` and publish. The canvas now shows exactly what the files show, with the stamp at the top of each board.
4. From now on the session is in its exported state (`state show` says so): every later change request, from chat or the canvas, is pulled, applied, vetted, exported again and delivered without waiting for another "done", and the boards are republished with the new stamp. Read back as usual, with the files sent.
5. When the person ends design mode ("close design mode", "we're finished"), `state <slug> close`.

## Speed (measured, 0.16)

- Building all nine fixture boards in one wire command takes about 0.9 s (one browser), against about 0.55 s per board run one at a time (2.5 s for the first, while Chromium warms up).
- Publishing ten boards and the index in one call takes about 7–8 s; reading five boards back about 11 s and puts every small board's full text in context. Skipping unneeded pulls (step 1 above) saves both.
- Uploading photos takes about 6 s per call of up to 25 files, once per piece.
- Boards are about a fifth smaller than in 0.15 (shared classes in place of repeated inline styles), even with real icons, link chips and brand components added; a real icon adds about 1 KB.
