# Prism

Prism turns raw material (notes, transcripts, documents, photos) into proofed, on-brand files: sheets, brochures, decks, blog posts and headers, social posts, stories, carousels, email headers and HTML emails. One approved `content.md` feeds every output, and a fixed build kit makes every file in whichever brand the content names.

It ships as a Claude plugin, built from this repository (the ChatGPT edition is deprecated and frozen; see `chatgpt/`). **v1 is the full launch; this tree is 0.16.0-dev.** See `HANDOFF.md` for the full working notes, standing rules and design decisions.

## Layout

| Path | What |
|---|---|
| `plugin/prism/` | The Claude edition: skills `prism-draft`, `prism-produce`, `prism-quick`, `prism-onboard`, agents `prism-writer`, `prism-reviewer`, `prism-formatter` |
| `plugin/prism/skills/prism-produce/kit/` (below: `kit/`) | The build kit every output goes through (copied into a workspace as `.prism-kit`) |
| `kit/roles.json` | Core's role vocabulary: what a brand must or may map |
| `kit/brands/<id>/` | One brand: `profile.json`, `snapshot/` of its design system, `layers/*.css`, `ornaments.js`, `digest.md`, brand-owned files |
| `tools/build.py` | Stamps the version and zips the plugin into `dist/` |
| `chatgpt/` | **Deprecated.** The frozen ChatGPT edition builder, kept for reference; not updated or built |
| `fixtures/` | One sample per output type, used for every regression build |
| `guide/` | The user guide (built as a sheet) |
| `docs/architecture.md` | Architecture diagrams (Mermaid): system overview, piece pipeline, build kit, brand system, co-op flow and open backlog items |
| `tests/` | `resolve.test.js`, `brands.test.js`, `drafts.test.js`, `onboard.test.js`, `diff-builds.py`, and the frozen `reference-0.13.1/` sources |
| `tools/` | `check-tutorial.py` (the tutorial matches the plugin; run before every build), `pin-profile.js` (re-pin a brand after its files change), `add-brand.py` (merge an onboarding bundle), `brand-art/` (Prism's artwork generator) |

Brands today: `case-amplify` (default) and `prism`; `run.sh brands` lists them, with any onboarding drafts. New brands come from onboarding (the `prism-onboard` skill, `kit/onboard.js`): a draft in the workspace's `.prism/brands/<id>/`, then a bundle that `python3 tools/add-brand.py BUNDLE.zip` adds here. A document picks one with `brand:` in its front matter; without one it uses the profile marked `"default": true`. Core never names a brand: a brand's identifying words go in its profile's `identity.terms`, and `tests/core-brand-free.test.py` keeps them out of core.

## Requirements

Node 20+, Python 3.10+, pandoc, and Chromium through Playwright. `kit/run.sh` runs `setup.sh` the first time an output type is built, which installs what that build needs (pandoc, Chromium, pptxgenjs, sharp, pikepdf, the Office fonts). Tests also use PyMuPDF (`pip install pymupdf`).

## Build

```bash
# The plugin zip into dist/ (version stamped everywhere; never pass --help: the first argument is the version)
python3 tools/build.py 0.16.0-dev

# One output, from a workspace with the kit copied in
cp -r plugin/prism/skills/prism-produce/kit .prism-kit
bash .prism-kit/run.sh sheet fixtures/sheet-paperwork-brief.md out/brief.pdf
bash .prism-kit/run.sh deck fixtures/deck.md out/deck.pptx
bash .prism-kit/run.sh social fixtures/carousel.md out/carousel
bash .prism-kit/run.sh email fixtures/html-email-newsletter.md out/newsletter
bash .prism-kit/run.sh blog fixtures/blog.md out/blog
bash .prism-kit/run.sh swatch prism out/prism-swatch.pdf      # how a brand maps onto Prism
bash .prism-kit/run.sh verify out/brief.pdf                     # --brand <id> for other brands
bash .prism-kit/run.sh onboard start acme ~/acme-design-system   # draft a brand (then map, report, bundle)
bash .prism-kit/run.sh library case-amplify                      # the brand's reusable photos, as brand:<id>
bash .prism-kit/run.sh wire fixtures/*.md --out wire --canvas wire/canvas --title "Test design"   # design-mode boards + canvas index
```

To build a fixture in another brand, add `brand: prism` to its front matter.

## Test

```bash
node tests/resolve.test.js            # the Case Amplify profile equals the 0.13.1 kit's values
node tests/brands.test.js             # core holds no brand; every brand resolves and its ornaments draw
python3 tests/assets.test.py          # focal points, crop markup and the brand image library
python3 tests/wire.test.py            # design mode: boards, canvas index, icons, links, brand lo-fi, edit read-back, state, co-op
python3 tests/tutorial.test.py        # the tutorial still describes every command, format and skill (build.py runs the same check)
python3 tests/core-brand-free.test.py # no brand is named in core; defaults come from the profiles
node tests/drafts.test.js             # onboarding drafts build like shipped brands, say so, and are never the default
node tests/onboard.test.js            # onboarding: draft from a design system, map, bundle, update
node tests/roles.test.js              # optional roles fall back, a required-only brand resolves, the profile's build theme
node tests/components.test.js         # closing styles, new design-system components noticed, components from the interview
```

**Regression rule:** before a change, build every fixture (and the guide) with the current kit; after it, build again and run `python3 tests/diff-builds.py BEFORE AFTER`. PDFs and PNGs are compared pixel by pixel, decks by slide XML and media, text outputs line by line. Two runs of an unchanged kit differ by nothing, so any reported difference is real and needs a reason.

## Brands

A brand is a Claude Design System plus a Prism profile. The profile maps core roles to the design system's own names and is shipped with a pinned snapshot, so builds never need access to the design system. Live sources:

- Case Amplify: https://claude.ai/artifact/MP9SjqKoJECgCoSWyQNG3m
- Prism: https://claude.ai/artifact/4Ayf7ASESQ5YYuXtBLTTbG

After changing any file in a brand folder, run `node tools/pin-profile.js <brand>`, then both tests. Prism's artwork is generated: `python3 tools/brand-art/prism.py <design-system project dir> <out dir>` (the brand's `snapshot/` works as the project dir).
