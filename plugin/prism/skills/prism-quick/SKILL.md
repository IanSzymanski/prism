---
name: prism-quick
description: >
  Use for any branded file someone needs fast, with no questions or proofing first: a
  one sheet, one-sheeter, one-pager, flyer, handout, leave-behind, fact sheet, brief, case study PDF, brochure, trifold, PowerPoint, slides, deck, blog post and blog header, social post, Instagram story, carousel or email header. Triggers: "quick", "fast", "rush", "I need a one sheet now", "skip the proof",
  "just make it", "quick mode". Builds one output in one pass with the brand kit, the only
  allowed way to make a designed branded file. Not for pieces to be drafted and proofed first (prism-draft).
metadata:
  version: "0.16.0-dev"
---

# Quick mode: raw material to one finished file, one pass

For someone who needs a document now and will review it afterwards. Speed comes from cutting stops, not rules: no interview, no subagents, no content.md, no proof stop (no proof doc), and one quick look instead of a visual review round. The brand and claims rules below still apply in full.

## Build route (always)

Every designed branded file (one sheet, one-sheeter, one-pager, flyer, handout, leave-behind, fact sheet, brief, case study PDF, brochure, trifold, PowerPoint, slides, deck, blog post and blog header, social post, Instagram story, carousel or email header) is built with this plugin's kit through `.prism-kit/run.sh`, and nothing else. Never use ReportLab, python-docx, python-pptx, hand-written HTML, a generic PDF or slides skill, or your own colours and fonts, even for a draft. If the kit cannot run, say which tool is missing and stop: never approximate the brand. Before delivering, run `.prism-kit/run.sh verify <file or folder>` and deliver only what it reports as `OK`.

## 1. Start (one Bash call, first thing)

```bash
mkdir -p <slug>/source <slug>/formats <slug>/out
[ -d .prism-kit ] || cp -r <this skill>/../prism-produce/kit .prism-kit
nohup bash .prism-kit/run.sh setup <sheet|social|deck> > .prism-kit/setup.log 2>&1 &
node .prism-kit/resolve.js <brand> --out .prism/brand/<brand>
```

The resolve line (`<brand>`: the one the user named, else `default`) checks the bundled brand snapshot; if it prints an error, stop and say what it printed, never approximate the brand. A `[brand] design system changed` line is only a warning. Setup for that output type runs in the background while you write; the build later waits for it if it is still going. It takes a second or two when the tools are already there. In the same call: save pasted text to `<slug>/source/pasted.md`; copy uploaded files into `source/`, converting Word and PDF to text beside them (`pandoc file.docx -t plain -o file.txt`, `pdftotext file.pdf`); normalise photos with `python3 .prism-kit/images.py <slug>/formats/images <photos>`. Look at each photo once with Read to spot identifiable people.

## 2. Decide without asking

- **Format:** what the user named, else a one-pager sheet. One format per quick run. A package ("case study package", several outputs at once) is not quick mode: say so in one line and start the prism-draft skill, since its outputs must share approved words. Sheet and single social posts: read nothing else, use the cheat sheets below. Brochure, blog, email, carousel, deck: read that card in `../prism-produce/references/formats/` first (deck builds are slower; say so).
- **Figures:** only numbers that appear in the source. No numbers in the source means no stats block. If the user asked for an example or mock piece, figures are illustrative and every output says so.
- **Photos:** use uploaded photos without identifiable people freely. Photos with people only if the user said they have permission; otherwise leave them out and say so. Best landscape photo becomes the hero. Layouts crop each photo around the focal point images.py found. No photos: no image blocks (no placeholders unless asked); a photo from the brand library (`.prism-kit/run.sh library <brand>`, `![](brand:<id>)`) only when the user asks for one.
- **Brand:** the one the user named, else the default (`.prism-kit/run.sh brands` marks it; it also gives the brand's name, contact line and default audience). Write `brand: <id>` in the front matter when it isn't the default.
- **Audience:** from the request, else the brand's default audience.

## 3. Write the format file in one Write call

`<slug>/formats/<format>.md`. Rules that still apply:

- Read the brand's rules once, its `digest` from `.prism-kit/run.sh brands --json` (claims, voice, visual); every one applies. The same listing's `components` are the brand's own blocks (a closing band, a quote banner): use one where it fits.
- No number, quote or result that isn't in the source.
- `{.no-rule}` on a `##` that sits right on top of a photo of a person.

### One-pager cheat sheet

```markdown
---
title: Headline with one *accent* word
pagetitle: Plain-text title
eyebrow: Topic · Audience
subtitle: One or two sentences.
author: <brand name>
date: <Month Year>
contact: <brand contact line>
legal: Fictional organization and figures   # only when illustrative
hero: small
---

::: hero-image
![](images/photo.jpg){.fade}
:::

## Section *heading*

::: stats
- **<figure from the source>** label under ten words
:::

::: {.features .three}
- []{.icon .ph-shield-check .accent} **Title** One sentence.
:::

::: {.callout .tint}
#### []{.icon .ph-sparkle .accent} Main takeaway
One or two sentences.
:::

::: checks
- Short item
:::

::: {.cta-card .small}
[<brand name>]{.eyebrow}

## Closing line with *one* accent word

One sentence. Start at [example.com](https://example.com).
:::
```

For a process, use a flow instead of feature cards (2 to 5 steps; wrap it in `::: band` with a `###` and a sentence for a tinted strip):

```markdown
::: flow
- **Conversation** Talk with the client as usual.
- **Review** Staff read the draft next to the case.
- **Record** Approved text is saved.
:::
```

When the source gives an address to scan (an event, a sign-up, a download), add a QR code where the reader acts, often inside the closing card. The build draws it black on white (no branding). `.left` puts the code left, `.center` puts it above centred text, `bg="black"` or `"transparent"` changes its ground, and `image="images/qr.png"` uses a code the user uploaded instead (copied unchanged, not through images.py):

```markdown
::: {.qr url="https://example.com/summit" label="example.com/summit"}
Scan to register for the fall summit.
:::
```

When the user asks for the logo in a place, add `logo="top-left|top|top-right|bottom-left|bottom|bottom-right"` (inside the block) or `logo="left|right"` (beside it) to that block; on a post, a corner moves the post's own logo.

Shape: hero (optional) → 2–3 short sections using the blocks above → cta-card last. About 350–450 words fits one page. Icons: shield-check, clock, users, file-text, chat-circle-text, calendar, clipboard-text, list-checks, sparkle, chart-bar, magnifying-glass, user-check.

### Social post cheat sheet

The `::: caption` block goes **inside** the post, before the closing `::::`. It holds the post copy and is not drawn on the image.

```markdown
---
title: Topic social posts
---

:::: {#short-id .post .square}
[Eyebrow · Topic]{.eyebrow}

## Heading with one *accent* word

One supporting sentence.

::: caption
Post copy in short paragraphs.

#Topic #Field
:::
::::
```

Sizes: `.square` 1080×1080 (default), `.portrait` 1080×1350, `.wide` 1200×627. For an Instagram story (`.story`, 1080×1920), read the Stories section of `../prism-produce/references/formats/social.md` first: text must stay inside the app's safe area, and the build flags anything outside it. `.dark` for a quote or closer. `#id` names the PNG. On the image: eyebrow, heading or stat, one sentence; everything else goes in the caption.

### Brochure

Read `../prism-produce/references/formats/brochure.md` and use the full-spread inside layout.

## 4. Build, check, deliver

1. One Bash call: check numbers against the source, build (the build prints the page count and any fit warnings).
   ```bash
   cat <slug>/source/*.md <slug>/source/*.txt 2>/dev/null > <slug>/all-source.txt
   .prism-kit/run.sh check <slug>/all-source.txt <slug>/formats/<format>.md
   .prism-kit/run.sh sheet <slug>/formats/<format>.md <slug>/out/$(.prism-kit/run.sh tag <slug>/formats/<format>.md).pdf   # prints the page count
   ```
   For social, email and carousel, the build line is instead:
   ```bash
   .prism-kit/run.sh social <slug>/formats/<format>.md <slug>/out/<format> && cat <slug>/out/<format>/*-captions.md
   For a deck: `.prism-kit/run.sh deck <slug>/formats/deck.md <slug>/out/$(.prism-kit/run.sh tag <slug>/formats/deck.md).pptx`. Every exported file starts with the piece tag (`<slug>-<output>-v<version>`) so pieces never mix.
   ```
   If the build prints `setup: MISSING ...`, tell the user which tool is unavailable and stop. Never mark setup as done by hand.
   A brand library photo (`brand:<id>`) is fetched before the build: `.prism-kit/run.sh library <brand> --need <slug>/formats/`, read the upload ids it prints in one call (the Artifact tool, the brand's `design_system` link, `paths`), then `.prism-kit/run.sh library <brand> --take <the folder the read names>`. If that fails, use `prism:placeholder` instead and say so.
2. Fix only hard failures, then rebuild once:
   - `[social] missing caption`, or any empty section in the captions file: move the `::: caption` inside that post's `::::` fence;
   - a number the check lists: remove it (the source wins);
   - a one-pager on two pages: `hero: x-small` and `{.cta-card .x-small}`; still two, cut the last section;
   - `[deck] slide N ... may not fit` or `[sheet] brochure ... runs past the panel bottom`: shorten that text.
3. One quick look: `.prism-kit/run.sh preview <slug>/out/preview.png <built file>` and look at the image once (for a deck only when LibreOffice, `soffice`, is installed). Fix only clipped or overlapping text or an empty page, then rebuild once. No second review round.
4. `.prism-kit/run.sh verify <built file or image folder>` (add `--brand <brand>` when the piece is not in the default brand). Deliver only on `OK`; on `FAIL`, rebuild through `run.sh`.
5. Send the PDF (or the PNGs and the captions file, or the PPTX) and the format file with SendUserFile.
6. Message, short:
   - one line on what it is, then one line per file saying what it is for (the file roles listed under "3. Deliver" in the prism-produce skill);
   - **"Quick mode: not proofed."** Then every number, quote and capability claim in the piece, as a short numbered list, so the user can check them in one read;
   - how to revise: reply with changes, or say "full proof" for the normal process.

## After delivery

<!-- claude-only -->
- Quick mode skips design mode to save time. "Design mode", "full proof" or a request to edit the layout visually promotes the piece (below), and prism-produce opens the design canvas for it.
<!-- /claude-only -->
- **"Editable", Illustrator, Canva, InDesign, .ai or .indd:** not offered. Changes are made here and rebuilt.
- **Changes in chat or an uploaded format file:** keep a copy, edit the format file, then vet and read back as in "Vet every edit" in the prism-produce skill (`.prism-kit/run.sh vet <file> --was <copy> --fix`). Run the check, build again, deliver. Same speed rules.
- **"Full proof", more formats, or a second output:** promote the piece. Write `content.md` from the format file (strip the layout markup back to plain Markdown, keep the words, `status: draft`, `version: 1`), record it in `log.md`, then continue with the prism-draft skill at step 3 (review and proofing stop). The existing format file stays as the first layout.
