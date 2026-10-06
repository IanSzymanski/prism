# Prism

Raw material in, branded Case Amplify files out, with a human proof in between.

## How to use it

1. **Draft.** Attach or paste anything (notes, a transcript, a document, and photos) and say "draft this into a case study" (or one-pager, brief, posts). Say which outputs you want if you know: sheet, deck, social, email, carousel. With photos, you'll be asked which one leads the piece, which to use, and whether people in them can be shown.
2. **Proof.** You get `content.md` (the words) and `claims.md` (every number and claim with its source), plus the reviewer's flags. Reply with edits or upload an edited content.md. Say "approve" when the words are right. Nothing is designed before this.
3. **Produce.** Say "produce a sheet and a carousel" (or any mix). Each output is laid out by its own formatter, checked so no number appears that isn't in content.md, built, previewed and sent back.
4. **Revise.** Reply with changes or upload an edited file.
   - Design mode opens as soon as the layout exists, for every format: a plain wireframe on a Claude Design canvas, with slides, posts and panels as frames. Edit words, drag blocks or slides into a new order or delete them there, then say "done". The changes go back into the Markdown, get vetted, and the files rebuild in the brand styles (Claude only; not in quick mode).
   - Wording, facts and numbers go into content.md and are patched into every output, keeping the layouts you approved.
   - Layout changes (move, split, restyle) touch only that one output.

**Quick mode.** Need a document now? Say "quick one-pager from this" (or "quick brochure"). No questions and no proof stop: one output is written, number-checked against your source, built and sent back in one pass, with a list of every number and claim to check afterwards. Say "full proof" later to move it into the normal process.

## Outputs

| Output | File | Notes |
|---|---|---|
| sheet | PDF, Letter | One-pagers, briefs, case studies, white papers. Photos as a hero band, media rows beside text, galleries or figures. |
| brochure | PDF, Letter trifold | Two sides, three panels each; wave headers throughout, and one design across the inside center and right |
| blog | header PNG + post.md/html | A 16:9 header whose design follows the post type, chart PNGs, and the post text for WordPress |
| deck | PPTX, 16:9 | Editable text and charts; photo on the title slide and media slides. Install the brand's Office fonts (`skills/prism-produce/kit/brands/<brand>/office`, sent as a zip with the first deck) to edit or present. |
| social | PNGs + captions | Square, portrait and wide posts, and 1080×1920 stories kept inside the app's safe area |
| email | PNGs at 2x + subject lines | Light, dark, and photo-split headers |
| carousel | PNG panels + caption | One wave line runs across every panel |

New in 0.6: workflow `flow` blocks in sheets, 3–5 step workflow slides in decks, fit warnings for deck text and brochure panels, a one-look visual check in quick mode, faster per-format setup and cached deck graphics.

## What's inside

- Skills: `prism-draft` (steps 1–4, ends at the proof) and `prism-produce` (formatting, builds, revisions).
- Agents: `prism-writer`, `prism-reviewer`, `prism-formatter`.
- `skills/prism-produce/kit`: build scripts, brand stylesheet, fonts (Literata, Inter, IBM Plex Mono; SIL Open Font License), Phosphor Light icons (MIT), logo and imagery.
- `skills/prism-produce/references/formats`: the Markdown syntax each output accepts.

Builds need pandoc, Node and Chromium. The first build of each output type checks only what that type needs (a sheet never waits for deck tools) and installs anything missing from the package registries, with a time limit on every step. Deck icons, backgrounds and rules are made once and cached with the kit.

PDFs embed real TrueType fonts (Literata, Inter, IBM Plex Mono) and draw icons as vector shapes. Files are not sent for editing in other apps: changes are made in design mode or chat and rebuilt. `run.sh fonts` makes the PowerPoint font pack sent with a deck.

Every revision is vetted before it is rebuilt (`run.sh vet`): numbering is fixed after a reorder, headings are reunited with their text, typos in changed passages are corrected, notes to the editor are left out, and the reply lists each fix.

A ChatGPT edition is built from this plugin by `convert.py`; every change ships in both.
