# content.md and claims.md

`content.md` is the single approved source of words for every output. Formatters may cut, reorder and split it, but never add facts to it. Keep it layout-free.

## content.md

```markdown
---
title: How *Harbor Point* got its afternoons back
subtitle: One or two sentences under the title.
audience: Operations leads at mid-size clinics
brand: <id>              # optional; a profile in kit/brands/. Default: the brand marked default (run.sh brands)
exports: [sheet, brochure, 5x7, deck, social, email, html-email, carousel, blog]
package: case-study      # optional; a package from run.sh packages. exports then lists its output ids
figures: real            # real | illustrative
status: draft            # draft | approved
version: 1
date: September 2026     # optional; shown on sheets
lang: en-US              # optional; the PDF's language (default: the brand's, else en-US)
keywords: [burnout, workforce]   # optional; PDF search keywords
---

## Section heading

Paragraphs in plain Markdown.

- Lists where the source has lists
- **Bold** only for terms the author stressed

> A quote, verbatim from the source.
>
> Name, Role

| Measure | Before | After |
|---|---|---|
| Documentation hours per week | 16.2 | 9.6 |
```

Rules:

- **Front matter**: all keys except `date`, `lang` and `keywords`, always. `exports` lists only what the user asked for. With a package, `package:` names it and `exports` lists its output ids (`run.sh packages use` prints both lines); `package.json` says which format each output is. `figures: illustrative` means every output must label the piece as fictional.
- **Allowed**: headings (`##`, `###`), paragraphs, bullet and numbered lists, bold, italic, links, blockquotes, plain tables, footnotes for sources.
- **QR codes**: when the piece asks readers to scan something, write it as its own paragraph in the section where they act: `QR code: [Register for the summit](https://example.com/summit)`. The link text says what scanning does; the address is the full https address. Formatters draw the code (or link it in email). An uploaded code is not placed here: it goes in images.md with Role `qr: <address>`.
- **Images**: plain Markdown only, in the section the image belongs to: `![Caption](images/file.jpg)`. A photo from the brand's image library (`run.sh library <brand>`) is `![Caption](brand:<id>)`. The caption is content, so it is proofed like any sentence; write `![](images/file.jpg)` only for a purely decorative image. No classes, no sizes, no crops: layout is the formatter's job, and every layout crops around the image's focal point on its own. Roles (hero, supporting) live in images.md, not here.
- **Not allowed**: `:::` blocks, `{.class}` attributes, icons, chart blocks, HTML. Layout belongs to the format files.
- **Emphasis in the title and `##` headings**: `*one word or short phrase*` marks the word shown in the brand's accent colour. At most one per heading. Leave it out if nothing deserves it.
- **Numbers**: write each figure the same way every time it appears (`41%`, `16.4 hours`). Formatters are checked against these, so a number that is not in content.md cannot appear in any output.
- **Series data**: if a chart is likely, keep the full series as a plain table (months and values). Formatters build charts only from tables in content.md.
- **Quotes**: verbatim, with the speaker on the last line. For illustrative pieces the name carries "(fictional)".
- **Voice**: keep the author's wording and order where it works. Fix grammar, filler and repetition; do not rewrite into a different voice.
- **Email** (when exports include `html-email`, or a package output in that format): add an `## Email` section at the end with `Subject:`, `Preheader:`, `Send from:` (the tool, so merge tags match it: Zoho CRM, Zoho Campaigns, other; when the source doesn't say, the brand's email tool from `run.sh brands`), the greeting with its merge tag as written for that tool (`Hi ${Contacts.First Name},`), each call to action as `[Label](https://full-address)`, and `Footer:` with the sender's postal address. These are proofed like any other words; the formatter takes them from here.
- **Reviewer flags** appear as `<!-- CHECK: reason -->` directly after the flagged sentence. They must be resolved or explicitly accepted before `status: approved`.

## claims.md

Every number, quote, named study, customer name and product capability claim in content.md, one row each.

```markdown
| # | Claim (as written in content.md) | Source | Status |
|---|---|---|---|
| 1 | 41% less time drafting case notes | Customer interview, 2026-08-14 | VERIFIED |
| 2 | Supervisors kept their sign-off step | Raw notes, para 6 | FROM SOURCE |
| 3 | Integrates with state reporting systems | none | VERIFY |
```

Status values: `VERIFIED` (a source document confirms it), `FROM SOURCE` (it is in the user's raw input but unconfirmed), `VERIFY` (no source; needs a human), `ILLUSTRATIVE` (made up on purpose for a fictional piece).

## images.md

Written at intake when the user supplied images; one row per image, in `images/` (normalised copies, originals stay in `source/`).

```markdown
| File | Pixels | Orientation | Shows | People | Role | Print fit | Focus |
|---|---|---|---|---|---|---|---|
| images/office.jpg | 3000×2000 | landscape | Open office, staff at desks | yes, staff, consent confirmed | hero | hero, full width, anything | 45% 40% |
| images/visit.jpg | 1600×2400 | portrait | Caseworker at a kitchen table, face turned away | yes, staff only | supporting: "What they changed" | media row, figure, gallery | 50% 30% |
| images/logo-wall.jpg | 900×600 | landscape | Partner logos | no | skip (user) | gallery or social only | 50% 50% |
| brand:team-office | | landscape | Team at the office (brand library) | yes, staff, consent on file | supporting: "Who we are" | from the library | 50% 35% |
```

- **Role**: `hero` (at most one), `supporting: <section>`, `gallery: <section>`, `qr: <address>` (an uploaded QR code, used in place of the generated one for that address), or `skip`. The user's answers at intake decide; otherwise the writer proposes and the reviewer flags.
- **People**: `no`, or who they are and the consent status the user gave. Clients, minors and anyone identifiable need explicit confirmation before use.
- **Focus**: the focal point (`x% y%` from the top left) that every layout keeps in frame when it crops the image to fit. `run.sh images` finds it and stores it in `images/.focus.json`; correct both when it misses what matters. Library photos carry their own.
- Library photos (`brand:<id>`) get a row when the piece uses one; their People and Focus come from the library listing.

## package.json

Written by `run.sh packages use <slug> <package>` when the piece is a package: the package, the brand, and each output with its id (its format file is `formats/<id>.md`), its format, its brief, and its counts (`posts`, `stories`, `pages`, `min_pages`, `max_pages`), with any changes the person asked for (`--drop`, `--set`, `--add`) listed under `changes`, and where it came from (`from`: core, the design system, or `this piece` for a one-off set made with `--new`). Run `use` again to change it; never edit it by hand.

## interview.md

The interview's answers (prism-draft step 2): the date, each question, and the answer or "skipped". Private working material: read by the writer, never sent to the person, never put in content.md, the proof, a design canvas, a built file, a connector or log.md.
