# Prism

Raw material in, on-brand files out, with a human proof in between. Brands live in the kit (`run.sh brands` lists them); a piece names one with `brand:`.

## How to use it

1. **Draft.** Attach or paste anything (notes, a transcript, a document, and photos) and say "draft this into a case study" (or one-pager, brief, posts). Say which outputs you want if you know: sheet, deck, social, email, html-email, carousel. An optional interview asks for the audience, length, outputs and photos; skip any question and answer it later. With photos, you'll be asked which one leads the piece, which to use, and whether people in them can be shown. Every layout crops photos around their focal point. To answer every question up front instead, say "interview me first".
2. **Proof.** You get `content.md` (the words) and `claims.md` (every number and claim with its source), plus the reviewer's flags. Reply with edits or upload an edited content.md. Say "approve" when the words are right. Nothing is designed before this.
3. **Produce.** Say "produce a sheet and a carousel" (or any mix). Each output is laid out by its own formatter, checked so no number appears that isn't in content.md, built, previewed and sent back.
4. **Revise.** Reply with changes or upload an edited file.
   - Wording, facts and numbers go into content.md and are patched into every output, keeping the layouts you approved.
   - Layout changes (move, split, restyle) touch only that one output.

**New to Prism?** Ask "how do I use Prism?" for a rundown.

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
| html-email | Email-safe HTML, plain text, images zip | Announcement, newsletter or letter; light-only, Outlook-safe palette, Zoho-ready |
| carousel | PNG panels + caption | One brand ornament line can run across every panel |

## What's inside

- Skills: `prism-draft` (steps 1–4, ends at the proof), `prism-produce` (formatting, builds, revisions) and `prism-quick` (one document, one pass).
- Writer, reviewer and formatter instructions in each skill's `references/agents/`, run as separate passes.
- `skills/prism-produce/kit`: build scripts, brand stylesheet, the core stylesheets and layouts, and one folder per brand under `brands/` (its design system snapshot: fonts, logos, imagery, tokens), Phosphor icons (MIT).
- `skills/prism-produce/references/formats`: the Markdown syntax each output accepts.

## Requirements (ChatGPT)

Builds run in ChatGPT's code sandbox and need Node, Python and access to the package registries (npm and PyPI). The first build of each output type sets up only what that type needs: a sheet checks pandoc and Chromium, a deck adds the PowerPoint tools and fonts. When the tools are already there this takes a second or two; anything missing is installed with a time limit on every step (pandoc from `pypandoc_binary`, Chromium from `@sparticuz/chromium`, PyMuPDF for previews). Files are saved under `/mnt/data` and shared as download links.

## Install

- **ChatGPT desktop / Codex:** put this folder where your marketplace file points (`~/.agents/plugins/marketplace.json`, source `local`), restart, then install it from the Plugins directory.
- **Workspace:** an admin can publish it to your workspace from the plugin portal.
- **Skills only:** each folder in `skills/` also works as a standalone skill, as long as `prism-produce` is installed next to the others (the kit lives there).
