# Prism

Prism turns raw material (notes, transcripts, documents, photos) into proofed, on-brand files: sheets, brochures, decks, blog posts and headers, social posts, stories, carousels, email headers and HTML emails. One approved `content.md` feeds every output, and a fixed build kit makes every file in whichever brand the content names.

It ships as a Claude plugin and a ChatGPT edition, both built from this repository. **v1 is the full launch; this tree is 0.15.0-dev.** See `HANDOFF.md` for the full working notes, standing rules and design decisions.

## Layout

| Path | What |
|---|---|
| `plugin/prism/` | The Claude edition: skills `prism-draft`, `prism-produce`, `prism-quick`, agents `prism-writer`, `prism-reviewer`, `prism-formatter` |
| `plugin/prism/skills/prism-produce/kit/` (below: `kit/`) | The build kit every output goes through (copied into a workspace as `.prism-kit`) |
| `kit/roles.json` | Core's role vocabulary: what a brand must or may map |
| `kit/brands/<id>/` | One brand: `profile.json`, `snapshot/` of its design system, `layers/*.css`, `ornaments.js`, `digest.md`, brand-owned files |
| `chatgpt/convert.py`, `chatgpt/meta/` | Builds the ChatGPT edition from the Claude source |
| `fixtures/` | One sample per output type, used for every regression build |
| `guide/` | The user guide (built as a sheet) |
| `tests/` | `resolve.test.js`, `brands.test.js`, `diff-builds.py`, and the frozen `reference-0.13.1/` sources |
| `tools/` | `pin-profile.js` (re-pin a brand after its files change), `brand-art/` (Prism's artwork generator) |

Brands today: `case-amplify` (default) and `prism`. A document picks one with `brand:` in its front matter.

## Requirements

Node 20+, Python 3.10+, pandoc, and Chromium through Playwright. `kit/run.sh` runs `setup.sh` the first time an output type is built, which installs what that build needs (pandoc, Chromium, pptxgenjs, sharp, pikepdf, the Office fonts). Tests also use PyMuPDF (`pip install pymupdf`).

## Build

```bash
# Both editions into dist/ (version stamped everywhere; never pass --help: the first argument is the version)
python3 chatgpt/convert.py 0.15.0-dev

# One output, from a workspace with the kit copied in
cp -r plugin/prism/skills/prism-produce/kit .prism-kit
bash .prism-kit/run.sh sheet fixtures/sheet-paperwork-brief.md out/brief.pdf
bash .prism-kit/run.sh deck fixtures/deck.md out/deck.pptx
bash .prism-kit/run.sh social fixtures/carousel.md out/carousel
bash .prism-kit/run.sh email fixtures/html-email-newsletter.md out/newsletter
bash .prism-kit/run.sh blog fixtures/blog.md out/blog
bash .prism-kit/run.sh swatch prism out/prism-swatch.pdf      # how a brand maps onto Prism
bash .prism-kit/run.sh verify out/brief.pdf                     # --brand <id> for other brands
bash .prism-kit/run.sh library case-amplify                      # the brand's reusable photos, as brand:<id>
```

To build a fixture in another brand, add `brand: prism` to its front matter.

## Test

```bash
node tests/resolve.test.js            # the Case Amplify profile equals the 0.13.1 kit's values
node tests/brands.test.js             # core holds no brand; every brand resolves and its ornaments draw
python3 tests/assets.test.py          # focal points, crop markup and the brand image library
```

**Regression rule:** before a change, build every fixture (and the guide) with the current kit; after it, build again and run `python3 tests/diff-builds.py BEFORE AFTER`. PDFs and PNGs are compared pixel by pixel, decks by slide XML and media, text outputs line by line. Two runs of an unchanged kit differ by nothing, so any reported difference is real and needs a reason.

## Brands

A brand is a Claude Design System plus a Prism profile. The profile maps core roles to the design system's own names and is shipped with a pinned snapshot, so builds never need access to the design system. Live sources:

- Case Amplify: https://claude.ai/artifact/MP9SjqKoJECgCoSWyQNG3m
- Prism: https://claude.ai/artifact/4Ayf7ASESQ5YYuXtBLTTbG

After changing any file in a brand folder, run `node tools/pin-profile.js <brand>`, then both tests. Prism's artwork is generated: `python3 tools/brand-art/prism.py <design-system project dir> <out dir>` (the brand's `snapshot/` works as the project dir).
