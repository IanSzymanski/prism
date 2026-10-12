# Prism

Raw material in, on-brand files out, with a human proof in between. The words are approved once, in `content.md`, and every output is laid out from them. Brands live in the kit (`run.sh brands` lists them); a piece names one with `brand:`, and without one it uses the default brand. Packages (`run.sh packages`) are set bundles of outputs from one piece, such as a case study package, delivered as one zip.

New to Prism? Run `/prism-tutorial` for a rundown (add a topic, such as `/prism-tutorial design mode`, for just that part).

## How to use it

1. **Draft.** Attach or paste anything (notes, a transcript, a document, photos) and say "draft this into a case study" (or one-pager, brochure, deck, posts, film). An interview asks only what it doesn't know: audience, length, outputs and photos (upload, use the brand's photo library, add later, or none). Skip any question and answer it later. To answer everything up front, start with `/prism-interview` (or say "interview me first").
2. **Proof.** The words open in a Claude Doc (content and a claims tab, each reviewer flag a comment): edit there, comment, or reply in chat. Without Claude Docs you get `content.md` (the words) and `claims.md` (every number and claim with its source). Say "approve" when the words are right. Nothing is designed before this.
3. **Produce.** Say "produce a sheet and a carousel" (or any mix, or a package). Each output is laid out by its own formatter, checked so no number appears that isn't in `content.md`, built, previewed, verified and sent back.
4. **Revise.** Reply with changes or upload an edited file.
   - **Design mode** opens as soon as the layout exists, for every format: a plain wireframe on a Claude Design canvas, with slides, posts and panels as frames. Edit words, drag blocks or slides into a new order or delete them, then say "done". The changes go back into the Markdown, get vetted, and the files rebuild in the brand's styles (not in quick mode; films go straight to their own page).
   - Wording, facts and numbers go into `content.md` and are patched into every output, keeping the layouts you approved.
   - Layout changes (move, split, restyle) touch only that one output.
   - Every revision is vetted before it is rebuilt: numbering is fixed after a reorder, headings are reunited with their text, typos in changed passages are corrected, notes to the editor are left out, and the reply lists each fix. Meaning (numbers, names, quotes, claims) never changes without asking.

**Quick mode.** Need a document now? Say "quick one-pager from this" (or "quick brochure"). No questions and no proof stop: one output is written, number-checked against your source, built and sent back in one pass, with every number and claim listed to check afterwards. Say "full proof" later to move it into the normal process.

**Work together (co-op mode).** Invite teammates by name: they edit the proof doc and the design canvas or ask `@claude` in comments, your Prism does the work, and only you approve and export. Invitees get the files from an Exports page and don't need Prism.

**Add a brand.** Say "add a brand" (or run `/prism-onboard`) with a design system's link or files. Prism maps its colours, fonts, type and logos onto its own roles without changing the design system, shows the result on a swatch sheet (in design mode first), and on "done" packs a brand bundle for the next release. Until then the brand works where it was made, as a draft.

## Outputs

| Output | File | Notes |
|---|---|---|
| sheet | PDF, Letter | One-pagers, briefs, case studies, white papers. Photos as a hero band, media rows beside text, galleries or figures; charts, flows, stats, QR codes. A white print copy on request. |
| brochure | PDF, Letter trifold | Two sides, three panels each; the brand's section rules throughout, and one design across the inside centre and right |
| 5x7 | PDF, 5 × 7 in card | Postcards, invitations, mailers, handouts. Front and an optional back, portrait or landscape, optional bleed. Fronts: standard, photo cover, statement; backs: standard, two columns, mailer with the address area left blank |
| deck | PPTX, 16:9 | Editable text and native charts; title, stats, features, workflow steps, quote, media, chart, QR and closing slides. Photos or device mockups on media slides, overset off the slide's edge or layered (a phone in front of a laptop). Install the brand's Office fonts (`skills/prism-produce/kit/brands/<brand>/office`, sent as a zip with the first deck) to edit or present. |
| social | PNGs + captions | Square, portrait and wide posts, and 1080×1920 stories kept inside the app's safe area |
| carousel | PNG panels + caption | One brand ornament line can run across every panel |
| email | PNGs at 2x + subject lines | Email header images: light, dark and photo-split |
| html-email | HTML + images zip + plain text | Whole HTML emails (newsletter, announcement, letter) that hold up in Outlook and dark mode; merge tags pass through untouched; light and dark previews |
| blog | header PNG + post.md/html | A 16:9 header whose design follows the post type, chart PNGs, and the post text for WordPress |
| motion | A film in Claude Motion | Short animated films (story, post, square or wide) from a direction script: each scene on its own brand ground with a moving backdrop, everything arriving and leaving, transitions instead of hard cuts. Each scene holds long enough to read once everything has arrived (longer for more words). Prism checks every line, number, seam and colour; **Export** on the film's page saves the MP4. Needs Claude Motion (Team and Enterprise plans). |

**Logos, QR codes and devices anywhere.** `logo="top-right"` (or any corner, edge or side) places the brand's logo on any block. A QR code block draws a scannable code for any address, or uses an uploaded one. A product screenshot can sit in a phone, tablet or laptop mockup in every format (`device=phone|tablet|laptop`).

**Photos.** Every layout crops a photo around its focal point (found automatically). Location and camera details are removed from every photo. Anything that prints under 150 dpi moves to a smaller layout or stays out of print.

## What's inside

- Skills: `prism-draft` (intake, writing, review, the proof), `prism-produce` (formatting, design mode, builds, revisions, films, packages, co-op), `prism-quick` (one output in one pass), `prism-onboard` (add or update a brand).
- Commands: `/prism-interview`, `/prism-onboard`, `/prism-tutorial`.
- Agents: `prism-writer`, `prism-reviewer`, `prism-formatter`.
- `skills/prism-produce/kit`: the build kit (`run.sh` is its one entry point), core stylesheets and layouts, the motion vocabulary, packages, device mockups, and one folder per brand under `brands/` (its design system snapshot: fonts, logos, imagery, tokens, and its profile). Phosphor icons (MIT) and a QR code generator (MIT) are vendored.
- `skills/prism-produce/references/formats`: the Markdown syntax each output accepts, plus `components.md` for blocks they share.

Builds need pandoc, Node and Chromium. The first build of each output type checks only what that type needs (a sheet never waits for deck tools) and installs anything missing from the package registries, with a time limit on every step. Deck icons, backgrounds and rules are made once and cached with the kit.

PDFs embed the brand's own TrueType fonts and draw icons, QR codes and device frames as vector shapes. Every file carries a Prism build stamp, and `run.sh verify` checks it and the fonts before delivery. Files are not sent for editing in other apps: changes are made in design mode or chat and rebuilt. `run.sh fonts` makes the PowerPoint font pack sent with a deck.
