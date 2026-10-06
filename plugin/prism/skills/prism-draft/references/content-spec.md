# content.md and claims.md

`content.md` is the single approved source of words for every output. Formatters may cut, reorder and split it, but never add facts to it. Keep it layout-free.

## content.md

```markdown
---
title: How *Cedar Hollow* got its afternoons back
subtitle: One or two sentences under the title.
audience: Program directors at human services agencies
brand: case-amplify      # optional; a profile in kit/brands/. Default case-amplify
exports: [sheet, brochure, deck, social, email, html-email, carousel, blog]
figures: real            # real | illustrative
status: draft            # draft | approved
version: 1
date: September 2026     # optional; shown on sheets
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

- **Front matter**: all keys except `date`, always. `exports` lists only what the user asked for. `figures: illustrative` means every output must label the piece as fictional.
- **Allowed**: headings (`##`, `###`), paragraphs, bullet and numbered lists, bold, italic, links, blockquotes, plain tables, footnotes for sources.
- **Images**: plain Markdown only, in the section the image belongs to: `![Caption](images/file.jpg)`. The caption is content, so it is proofed like any sentence; write `![](images/file.jpg)` only for a purely decorative image. No classes, no sizes: layout is the formatter's job. Roles (hero, supporting) live in images.md, not here.
- **Not allowed**: `:::` blocks, `{.class}` attributes, icons, chart blocks, HTML. Layout belongs to the format files.
- **Emphasis in the title and `##` headings**: `*one word or short phrase*` marks the word shown in the brand's accent colour. At most one per heading. Leave it out if nothing deserves it.
- **Numbers**: write each figure the same way every time it appears (`41%`, `16.4 hours`). Formatters are checked against these, so a number that is not in content.md cannot appear in any output.
- **Series data**: if a chart is likely, keep the full series as a plain table (months and values). Formatters build charts only from tables in content.md.
- **Quotes**: verbatim, with the speaker on the last line. For illustrative pieces the name carries "(fictional)".
- **Voice**: keep the author's wording and order where it works. Fix grammar, filler and repetition; do not rewrite into a different voice.
- **Email** (when exports include `html-email`): add an `## Email` section at the end with `Subject:`, `Preheader:`, `Send from:` (the tool, so merge tags match it: Zoho CRM, Zoho Campaigns, other), the greeting with its merge tag as written for that tool (`Hi ${Contacts.First Name},`), each call to action as `[Label](https://full-address)`, and `Footer:` with the sender's postal address. These are proofed like any other words; the formatter takes them from here.
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
| File | Pixels | Orientation | Shows | People | Role | Print fit |
|---|---|---|---|---|---|---|
| images/office.jpg | 3000×2000 | landscape | Open office, staff at desks | yes, staff, consent confirmed | hero | hero, full width, anything |
| images/visit.jpg | 1600×2400 | portrait | Caseworker at a kitchen table, face turned away | yes, staff only | supporting: "What they changed" | media row, figure, gallery |
| images/logo-wall.jpg | 900×600 | landscape | Partner logos | no | skip (user) | gallery or social only |
```

- **Role**: `hero` (at most one), `supporting: <section>`, `gallery: <section>`, or `skip`. The user's answers at intake decide; otherwise the writer proposes and the reviewer flags.
- **People**: `no`, or who they are and the consent status the user gave. Clients, minors and anyone identifiable need explicit confirmation before use.
