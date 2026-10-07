# Prism

Raw material in, on-brand files out, with a human proof in between. Brands live in the kit (`run.sh brands` lists them); a piece names one with `brand:`. Packages (`run.sh packages`) are set bundles of outputs from one piece, such as a case study package, delivered as one zip.

## How to use it

1. **Draft.** Attach or paste anything (notes, a transcript, a document, and photos) and say "draft this into a case study" (or one-pager, brief, posts). Say which outputs you want if you know: sheet, deck, social, email, carousel. An optional interview asks for the audience, length, outputs and photos; skip any question and answer it later. With photos, you'll be asked which one leads the piece, which to use, and whether people in them can be shown. Every layout crops photos around their focal point. To answer every question up front instead, start with `/prism-interview` (or say "interview me first").
2. **Proof.** The words open in a Claude Doc (content and a claims tab, each reviewer flag a comment): edit them there, comment, or reply in chat. Without Claude Docs you get `content.md` (the words) and `claims.md` (every number and claim with its source) to edit or reply to. Say "approve" when the words are right. Nothing is designed before this.
3. **Produce.** Say "produce a sheet and a carousel" (or any mix). Each output is laid out by its own formatter, checked so no number appears that isn't in content.md, built, previewed and sent back.
4. **Revise.** Reply with changes or upload an edited file.
   - Design mode opens as soon as the layout exists, for every format: a plain wireframe on a Claude Design canvas, with slides, posts and panels as frames. Edit words, drag blocks or slides into a new order or delete them there, then say "done". The changes go back into the Markdown, get vetted, and the files rebuild in the brand styles (Claude only; not in quick mode).
   - Wording, facts and numbers go into content.md and are patched into every output, keeping the layouts you approved.
   - Layout changes (move, split, restyle) touch only that one output.

**Add a brand.** Say "add a brand" (or run `/prism-onboard`) with a design system's link or files. Prism maps its colours, fonts, type and logos onto its own roles without changing the design system, shows the result on a swatch sheet (in design mode first), and on "done" packs a brand bundle for the next release. Until then the brand works where it was made, as a draft.

**New to Prism?** Run `/prism-tutorial` for a rundown (add a topic, such as `/prism-tutorial design mode`, for just that part).

**Quick mode.** Need a document now? Say "quick one-pager from this" (or "quick brochure"). No questions and no proof stop: one output is written, number-checked against your source, built and sent back in one pass, with a list of every number and claim to check afterwards. Say "full proof" later to move it into the normal process.

## Outputs

| Output | File | Notes |
|---|---|---|
| sheet | PDF, Letter | One-pagers, briefs, case studies, white papers. Photos as a hero band, media rows beside text, galleries or figures. |
| brochure | PDF, Letter trifold | Two sides, three panels each; the brand's section rules throughout, and one design across the inside center and right |
| blog | header PNG + post.md/html | A 16:9 header whose design follows the post type, chart PNGs, and the post text for WordPress |
| deck | PPTX, 16:9 | Editable text and charts; photo on the title slide and media slides. Install the brand's Office fonts (`skills/prism-produce/kit/brands/<brand>/office`, sent as a zip with the first deck) to edit or present. |
| social | PNGs + captions | Square, portrait and wide posts, and 1080×1920 stories kept inside the app's safe area |
| email | PNGs at 2x + subject lines | Light, dark, and photo-split headers |
| carousel | PNG panels + caption | One brand ornament line can run across every panel |

New in 0.6: workflow `flow` blocks in sheets, 3–5 step workflow slides in decks, fit warnings for deck text and brochure panels, a one-look visual check in quick mode, faster per-format setup and cached deck graphics.

## What's inside

- Skills: `prism-draft` (steps 1–4, ends at the proof) and `prism-produce` (formatting, builds, revisions).
- Agents: `prism-writer`, `prism-reviewer`, `prism-formatter`.
- `skills/prism-produce/kit`: build scripts, brand stylesheet, the core stylesheets and layouts, and one folder per brand under `brands/` (its design system snapshot: fonts, logos, imagery, tokens), Phosphor icons (MIT).
- `skills/prism-produce/references/formats`: the Markdown syntax each output accepts.

Builds need pandoc, Node and Chromium. The first build of each output type checks only what that type needs (a sheet never waits for deck tools) and installs anything missing from the package registries, with a time limit on every step. Deck icons, backgrounds and rules are made once and cached with the kit.

PDFs embed the brand's own TrueType fonts and draw icons as vector shapes. Files are not sent for editing in other apps: changes are made in design mode or chat and rebuilt. `run.sh fonts` makes the PowerPoint font pack sent with a deck.

Every revision is vetted before it is rebuilt (`run.sh vet`): numbering is fixed after a reorder, headings are reunited with their text, typos in changed passages are corrected, notes to the editor are left out, and the reply lists each fix.

