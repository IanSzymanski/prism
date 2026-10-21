# Prism

Prism turns raw material (notes, transcripts, documents, photos) into proofed, on-brand files. The words are written and approved once, in `content.md`; every output is laid out from them by a fixed build kit, in whichever brand the piece names, so nothing drifts and no number appears that isn't in the approved words.

It ships as a Claude plugin built from this repository. **This is 1.0.0, the first release** (a zip of the plugin is attached to each release in the GitHub Releases section; `.github/workflows/release.yml` builds it). `HANDOFF.md` holds the working notes, standing rules and design decisions; the backlog lives in the pinned Prism Backlog artifact it links. The ChatGPT edition is deprecated and frozen (`chatgpt/`).

## What it makes

| Output | Build | File |
|---|---|---|
| Sheet (one-pager, brief, case study, white paper) | `run.sh sheet` | Letter PDF, plus an optional white print copy (`--print`) |
| Brochure | `run.sh sheet` with `layout: brochure` | Letter trifold PDF, two sides of three panels |
| 5x7 card (postcard, invitation, mailer) | `run.sh sheet` with `layout: 5x7` | 5 × 7 in PDF, front and optional back, portrait or landscape, optional bleed |
| Deck | `run.sh deck` | Editable 16:9 PowerPoint with native charts; the brand's Office fonts come as a pack (`run.sh fonts`) |
| Social posts, stories, carousels, email headers | `run.sh social` | PNGs plus `captions.md`; stories are checked against the app's safe area |
| Blog post | `run.sh blog` | Header PNG, chart PNGs, `post.md` and `post.html` |
| HTML email | `run.sh email` | HTML, an images zip, plain text, light and dark previews |
| Animated film | `run.sh motion brief` | A brief Claude Motion makes the film from; Prism checks and renders the film it made; Export on the film's page saves the MP4. Techniques: stat story, kinetic type and UI walkthrough (`run.sh motion gaps` lists what a walkthrough still needs from the person) |
| Package | `run.sh packages` | A set of outputs from one piece (such as a case study package), delivered as one zip |

Every block format the outputs share (stats, charts, flows, quotes, media rows, galleries, QR codes, logo positions, brand components, device mockups) is described in `plugin/prism/skills/prism-produce/references/formats/`, one card per output plus `components.md`.

**Device mockups** (core): `![](images/app.png){device=phone|tablet|laptop}` puts a screenshot in a phone, tablet or laptop frame (`tone="light"` for silver, `.landscape` to turn a phone or tablet). Sheets, brochures, cards and posts draw the frame as vector; decks place framed PNGs and add **overset** media slides (`.overset-left`, `.overset-right`: the picture runs off that edge) and **layers** (a laptop with a phone in front, each its own picture); films take `frame=phone|tablet|laptop`. `run.sh devices render SHOT OUT.png --device laptop` makes one on its own.

**UI walkthroughs** (`technique: walkthrough`): a product film rebuilt from the person's screenshots, which are layout guides (`{.screen}`) rather than pictures: an opening title, the app building in, numbered steps with a collapsing step card, actions (`.click`, `.fill`, `.choose`, `.focus`, `.open`, `.toast` and more) that run one after another, and an end card with a recap of the steps. Hand-offs follow the screens: the same screen keeps its chrome, a desktop-to-phone change reframes, and the brief carries the house rules for walkthrough videos (pacing, zoom, focus scrim, typing speed, nothing overset). `run.sh motion gaps` turns what's missing (screenshots, demo or real data, the call to action, assumed details) into interview questions; the needed ones stop the brief.

**Motion holds** grow with the words on screen: after its last entrance lands, every scene holds a second for every 20 characters it shows (3 s at least, 12 s at most). `read:` in a film's front matter changes the rate; `hold=` on a scene sets one by hand.

## How a piece is made

1. **Draft** (`prism-draft`): an interview asks only what it doesn't know (audience, length, outputs, photos); `/prism-interview` asks everything up front. A writer agent produces `content.md` and a `claims.md` ledger; a reviewer agent flags claims and brand issues without rewriting.
2. **Proof:** the words open in a Claude Doc (content, claims, reviewer flags as comments), or as the two files. Approval is a hard stop: nothing is designed before it.
3. **Produce** (`prism-produce`): one formatter agent per output writes `formats/<format>.md`; then a number check, design mode, build, preview, `verify`, delivery.
4. **Revise:** wording and facts go into `content.md` and are patched into every format file; layout changes touch one output. Every edit is vetted (`run.sh vet`).

Also:

- **Quick mode** (`prism-quick`): one output in one pass, no questions and no proof stop; the reply lists every claim to check.
- **Design mode:** a plain wireframe of each output on a Claude Design canvas; drag, delete and edit there, say "done", and the changes go back into the Markdown and rebuild.
- **Co-op mode:** the owner invites teammates to the proof doc and canvas; their `@claude` requests are applied by the owner's Prism; only the owner approves and exports (`plugin/prism/skills/prism-produce/references/coop.md`).
- **Brands:** `prism-onboard` (or `/prism-onboard`) maps a design system onto Prism's roles, shows it on a swatch sheet and packs a bundle for the next release.
- **Tutorial:** `/prism-tutorial` is a guided walkthrough on a sample piece in the default brand (another with `/prism-tutorial in the <brand> brand`): the sample prompt and notes, the interview, the draft, the proof in Claude Docs, design mode in Claude Design, the export, then the same words as a deck, a carousel or an animated film, with why each stage is there, what can be done in it and how it is shared, and a pause after each one (`prism-draft/references/walkthrough.md`). `/prism-tutorial rundown` gives the overview, and a topic (`/prism-tutorial design mode`) just that part.

## Layout

| Path | What |
|---|---|
| `plugin/prism/` | The plugin: skills `prism-draft`, `prism-produce`, `prism-quick`, `prism-onboard`; agents `prism-writer`, `prism-reviewer`, `prism-formatter`; commands `/prism-interview`, `/prism-onboard`, `/prism-tutorial` |
| `plugin/prism/skills/prism-produce/kit/` (below: `kit/`) | The build kit every output goes through, copied into a workspace as `.prism-kit` |
| `kit/run.sh` | The one entry point for every build and tool (below) |
| `kit/roles.json` | Core's role vocabulary: what a brand must or may map |
| `kit/brands/<id>/` | One brand: `profile.json`, a pinned `snapshot/` of its design system, `layers/*.css`, `ornaments.js`, `digest.md`, Office fonts, brand-owned files |
| `kit/motion-techniques.json` | The motion vocabulary: techniques, layouts, classes, transitions, backdrops, frames and the hold rule |
| `kit/packages.json` | Core packages (brands add their own in their design system) |
| `kit/tutorial/` | The walkthrough's neutral sample piece (`sample.json`, fictional notes); a brand's own sample is `kit/brands/<id>/tutorial/`, with fixed files (draft, proof comments, approved words, layouts) so every run shows the same doc, flags and boards |
| `kit/devices.js` | Phone, tablet and laptop mockups |
| `fixtures/` | One sample per output type, used for every regression build |
| `guide/` | The user guide, built as a sheet |
| `tests/` | The test suites (below), `diff-builds.py`, the frozen `reference-0.13.1/` sources and the `f15/` co-op test kit |
| `tools/` | `build.py` (stamps the version, checks the tutorial, zips the plugin into `dist/`), `check-tutorial.py`, `pin-profile.js`, `add-brand.py`, `brand-art/` |
| `fonttools/` | `add_arrows.py`, which added ← → ↑ ↓ to the kit fonts |
| `chatgpt/` | **Deprecated.** The frozen ChatGPT edition builder; not updated or built |

Brands today: run `run.sh brands` (it marks the default and lists onboarding drafts). A piece picks one with `brand:` in its front matter. Core never names a brand: a brand's identifying words live in its profile's `identity.terms`, and `tests/core-brand-free.test.py` keeps them out of core.

## Requirements

Node 20+, Python 3.10+, pandoc, and Chromium through Playwright. `kit/run.sh` runs `setup.sh` the first time an output type is built and installs what that build needs (pandoc, Chromium, pptxgenjs, sharp, pikepdf, the Office fonts); `run.sh setup all` does it up front. Tests also use PyMuPDF (`pip install pymupdf`).

## Build

```bash
# The plugin zip into dist/ (version stamped everywhere; never pass --help: the first argument is the version)
python3 tools/build.py 1.0.0

# One output, from a workspace with the kit copied in
cp -r plugin/prism/skills/prism-produce/kit .prism-kit
bash .prism-kit/run.sh sheet fixtures/sheet-paperwork-brief.md out/brief.pdf      # --print adds the white print copy
bash .prism-kit/run.sh sheet fixtures/brochure.md out/brochure.pdf
bash .prism-kit/run.sh sheet fixtures/5x7.md out/card.pdf
bash .prism-kit/run.sh deck fixtures/deck.md out/deck.pptx
bash .prism-kit/run.sh social fixtures/carousel.md out/carousel                  # also social.md, stories.md, email.md
bash .prism-kit/run.sh blog fixtures/blog.md out/blog
bash .prism-kit/run.sh email fixtures/html-email-newsletter.md out/newsletter
bash .prism-kit/run.sh motion brief fixtures/motion.md --out out/motion           # then link, check and render the film
bash .prism-kit/run.sh motion gaps fixtures/motion-walkthrough.md                 # a walkthrough's questions for the person
bash .prism-kit/run.sh devices render shot.png out/shot-laptop.png --device laptop
bash .prism-kit/run.sh verify out/brief.pdf                                       # deliver only on OK
```

The other `run.sh` commands:

| Command | What |
|---|---|
| `check` | Numbers in a format file that aren't in `content.md` |
| `vet` | Fixes numbering and slips after an edit, flags what needs a look, lists changed passages (`--was`, `--fix`) |
| `preview` | A contact sheet of built outputs (PDF pages, slides, PNGs) for a visual check |
| `images` | Normalises uploaded photos and finds each one's focal point |
| `library` | The brand's reusable photos (`brand:<id>` in Markdown) |
| `fonts` | The PowerPoint font pack sent with a deck |
| `tag` | The naming rule for exported files (`<slug>-<output>-v<version>`) |
| `wire`, `wire-diff` | Design mode: boards and canvas, then reading edits back into the Markdown |
| `state` | A piece's state between sessions: canvas, versions, exports, co-op owner and invitees |
| `exports` | The Exports page for co-op invitees |
| `packages` | List, use, check, claim-check and zip packages |
| `brands`, `resolve`, `palette`, `swatch`, `pin`, `ds` | Brands: list them, resolve a profile's roles, the email and Office palette, the swatch sheet, re-pin after a change, read a design system in |
| `onboard` | Add or update a brand (`start`, `map`, `report`, `bundle`, `update`) |
| `tutorial` | The walkthrough's sample piece in a brand (`--out <workspace>` sets it up, `--prompt` prints the full sample message the person is shown, `--approve` and `--format <name>` put a sample's fixed approved words and layouts in place, `--json`) |
| `devices` | Device mockups: `list`, `render`, `svg`, `html` |
| `setup` | Install a part's tools up front |

To build a fixture in another brand, add `brand: <id>` to its front matter.

## Test

```bash
node tests/resolve.test.js             # the default profile equals the 0.13.1 kit's values
node tests/brands.test.js              # core holds no brand; every brand resolves and its ornaments draw
node tests/roles.test.js               # optional roles fall back, a required-only brand resolves, the profile's build theme
node tests/drafts.test.js              # onboarding drafts build like shipped brands, say so, and are never the default
node tests/onboard.test.js             # onboarding: draft from a design system, map, bundle, update
node tests/components.test.js          # closing styles, new design-system components noticed, components from the interview
node tests/packages.test.js            # packages: definitions, a piece's package, checks, claims, the zip
node tests/qr.test.js                  # the QR block in every output
node tests/sheet-modifiers.test.js     # sheet modifiers: title-area photo, fill: page, colophon: off, plain flows, rounded QR codes
node tests/logo.test.js                # logo positions on any block
node tests/card5x7.test.js             # 5x7 cards: sizes, sides, overflow, packages and design mode
node tests/kit-small.test.js           # file tags, state paths, unbroken terms, PDF details, photo metadata, print copies
node tests/motion.test.js              # motion: the language, holds, the brief, the film check, walkthroughs and their gaps
node tests/devices.test.js             # device mockups: geometry, sheets, overset and layered deck slides, films
python3 tests/assets.test.py           # focal points, crop markup, the brand image library, photo metadata
python3 tests/wire.test.py             # design mode: boards, canvas, read-back, state, co-op
python3 tests/tutorial.test.py         # the tutorial and walkthrough still describe every command, format, skill and stage; samples complete
python3 tests/readme.test.py           # this README still names every run.sh command and test suite
python3 tests/core-brand-free.test.py  # no brand is named in core; defaults come from the profiles
```

**Regression rule:** before a change, build every fixture (and the guide) with the current kit; after it, build again and run `python3 tests/diff-builds.py BEFORE AFTER`. PDFs and PNGs are compared pixel by pixel, decks by slide XML and media, text outputs line by line. Two runs of an unchanged kit differ by nothing, so any reported difference is real and needs a reason.

**Keep this README current:** a new `run.sh` command, output, test suite or user-facing feature updates this file and `plugin/prism/README.md` in the same change. `tests/readme.test.py` fails when a command or test suite is missing here.

## Brands

A brand is a Claude Design System plus a Prism profile. The profile maps core roles to the design system's own names and ships with a pinned snapshot, so builds never need access to the design system. Each profile's `url` is its live design system.

A brand sets its own sheet defaults in its profile's `options.sheet`: `byline: false` (no author and date under the title), `colophon: false` (no closing line; `colophon: on` in a format file brings it back), `cta_qr: "beside-copy"` (a closing card's QR beside all of its copy) and `checks: ["orphans", "variety"]` (`sheet-checks.js`: titles and headings never end on one word, paragraphs that do are reported, and sections that keep using the same format are reported). Case Amplify turns all of them on.

After changing any file in a brand folder, run `node tools/pin-profile.js <brand>`, then the resolve and brands tests. Prism's own artwork is generated: `python3 tools/brand-art/prism.py <design system project dir> <out dir>` (the brand's `snapshot/` works as the project dir).
