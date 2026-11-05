# Other revisions

The prism-produce skill's less common revisions (section 4). The two lanes, "Vet every edit" and "Read back" in the skill apply to each.

**Uploaded format file:** compare its wording against content.md. Pure layout changes: layout lane. Wording changes: ask once whether they should go back into content.md so the other outputs match; if yes, content lane; if no, keep them in that format only and note it in log.md.

**A website page edited on the site** (after it was pasted into WordPress): before the next rebuild, ask for the page's markup (Code editor, copy all) and run `.prism-kit/run.sh web compare out/web/<tag>-blocks.html <their copy>.html`. It lists every block that changed. Carry wording changes into content.md (content lane) and layout changes into the format file, then rebuild, so the new build doesn't undo their edits.

**Motion outputs** are revised in place on their film, never remade: `references/film.md`, "Revise it". Comments on the film page arrive pinned to a moment; map it to a scene with film.json.

**New images later** (uploaded after approval, during design mode or after delivery):

1. Normalise and look at them as in the prism-draft skill's Images steps (`.prism-kit/run.sh images <slug>/images <files>`, then copy the new files and `.focus.json` into `formats/images/`), and add their rows to images.md. Ask only what you can't see: who the people are and whether there is permission, when anyone is identifiable.
2. A caption is content: add the image line to content.md in its section (content lane, vetted like any edit). Then place the image in each format the person named, or in every format where it fits, as the component that suits its orientation and print fit (layout lane).
3. Each photo is cropped to its slot around its focal point. "Keep her face in frame", "show more of the building": change that image's focus in images.md and `.focus.json` (every format), or write `{focus="x% y%"}` on it in one format file (that format only).
4. In design mode, republish the changed boards; otherwise number check, rebuild, deliver.
5. A photo worth reusing across pieces belongs in the brand's design system photo library; say so once.
6. An uploaded QR code (images.md Role `qr: <address>`) replaces the generated one: add `image="images/<file>"` to every qr block and qr slide with that address (layout lane), copied into `formats/images/` unchanged.
