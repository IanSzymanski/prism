---
name: prism-produce
description: >
  Use to build or revise any designed branded file with the brand kit, the only allowed way to
  make one: one sheet, one-sheeter, one-pager, flyer, handout, leave-behind, fact sheet, brief, case study PDF, brochure, trifold, PowerPoint, slides, deck, blog post and blog header, social post, Instagram story, carousel, email header or HTML email (newsletter, announcement, outreach email). Triggers: "produce", "build", "make a PDF / PowerPoint / one sheet from this",
  "rebuild", "change the headline", "move the chart", "apply my edits", "design mode", "edit the layout visually",
  "I'm done editing", an edited format file, or a finished Markdown file in the Prism format. Works from an approved content.md.
metadata:
  version: "0.16.0-dev"
---

# Produce: approved content to finished files, and revisions

Steps 5–7 of the content process, plus the revision loop. Inputs come from `prism-draft`.

## Automate non-destructive steps

When the next step can't lose work or change meaning, take it without asking: start producing once content is approved and outputs are named, rebuild after a change. Keep a question only for steps that are destructive or change meaning: approving with open flags, changing numbers, names, quotes or claims, overwriting a file the person supplied, or carrying a wording change from one output into the others.

## Build route (always)

Every designed branded file (one sheet, one-sheeter, one-pager, flyer, handout, leave-behind, fact sheet, brief, case study PDF, brochure, trifold, PowerPoint, slides, deck, blog post and blog header, social post, Instagram story, carousel, email header or HTML email) is built with this plugin's kit through `.prism-kit/run.sh`, and nothing else. Never use ReportLab, python-docx, python-pptx, hand-written HTML, a generic PDF or slides skill, or your own colours and fonts, even for a draft. If the kit cannot run, say which tool is missing and stop: never approximate the brand. Before delivering, run `.prism-kit/run.sh verify <file or folder>` and deliver only what it reports as `OK`.

Files next to this SKILL.md:

- `kit/`: build scripts, stylesheets, fonts, images. Entry points `setup.sh` and `run.sh`.
- `references/formats/`: one card per output (`sheet.md`, `brochure.md`, `blog.md`, `deck.md`, `social.md`, `email.md` for header images, `html-email.md` for whole emails, `carousel.md`) plus `components.md` shared by all.
- The brand's digest: its rules (claims, voice, visual), passed to every formatter and reviewer. `<brand>` is content.md `brand:`, else the default brand (`.prism-kit/run.sh brands` marks it); `run.sh brands --json` gives each brand's `digest` path (a shipped brand's is in `kit/brands/<brand>/`, a draft from onboarding's in `.prism/brands/<brand>/` beside `.prism-kit`).
- `run.sh swatch <brand> out/<brand>-swatch.pdf`: the swatch sheet, in its own neutral format: how the brand's design system maps onto every core role, its ornaments by place, Office fonts, email palette checks, unused tokens and unmapped roles, then one sample of every sheet layout built in the brand (the layouts' Markdown is written beside it as `-layouts.md`). Make it when a brand profile is new or changed, or when asked to check a brand.
<!-- claude-only -->
- `references/wireframe.md`: design mode, the wireframe canvas in Claude Design for every format.
<!-- /claude-only -->
- `references/agents/`: agent instructions, for when the agents are not installed.

## Running the subagents

Use the named agent (prism-writer, prism-reviewer, prism-formatter) when it is installed. If it is not (this skill was installed on its own, without the plugin), start a general-purpose subagent instead, with the full text of `references/agents/<agent>.md` as the start of its prompt, followed by the inputs listed below. The instructions are identical either way.

## 0. Preflight

1. Find the project folder (`<slug>/` with content.md). If the user supplied a finished format file only, create a project around it and skip to step 3.
2. Read content.md front matter. If `status` is not `approved`, stop and send the user back to proofing (the prism-draft skill). Do not format unapproved content.
3. Once per session: copy `kit/` to `<workspace>/.prism-kit`. Every build goes through `.prism-kit/run.sh`, which sets up the tools that output type needs the first time it is built (a sheet never waits for deck tools). If it prints `setup: MISSING ...`, install that tool (`apt-get install -y pandoc` for pandoc) and build again. Never create the `.ready-*` files by hand.
4. Once per session, resolve the brand: `.prism-kit/run.sh resolve <brand> --out .prism/brand/<brand>` (`brand` from content.md, else the default from `run.sh brands`). It checks the brand's bundled snapshot and maps every core role to its value. An error stops the work: say what it printed and never approximate the brand. A `[brand] design system changed since this release` line is a warning: build anyway (the snapshot is what this release was checked against) and pass the line on to the user once, adding that the prism-onboard skill can update the brand from the changed design system. A `new component <name>` line means the design system gained a component Prism doesn't know yet: offer to add it to the brand (prism-onboard, "A new component"), which starts with a short interview about when and how often to use it. A `[brand] draft:` line means the brand is an onboarding draft, not yet in a release: build, and say so once.
<!-- claude-only -->
   Before resolving, if the Artifact tool is available, read the brand's design system once (`design_system` from `.prism-kit/run.sh brands --json`, no path) and add `--live <the folder the read names>`, so a changed design system is reported. If the read fails or is refused, resolve without `--live` and say nothing.
<!-- /claude-only -->
5. Exports = what the user asks for now, else the `exports` list in content.md.
6. **Package** (content.md names a `package:`): the outputs are the ones in `<slug>/package.json`. Each output is its own format file, `formats/<output id>.md`, laid out with its `format`'s card, so two outputs of one format (a one-pager and the full case study PDF, both sheets) never share a file. A change to the set ("no deck", "three posts", "add a carousel") is `.prism-kit/run.sh packages use <slug> <package>` with `--drop`, `--set` or `--add`, which rewrites package.json; then content.md's `exports` line.

## 1. Format (subagents)

- One export: format it yourself, following the same rules as the prism-formatter agent and its card.
- Two or more: run one **prism-formatter** agent per export, in parallel. Pass each: format name, mode `create`, and absolute paths of content.md, `references/formats/<format>.md`, `references/formats/components.md`, the brand digest (its `digest` path from `.prism-kit/run.sh brands --json`), the brand's own components (`components` from the same listing; omit when empty), and the target `formats/<format>.md`.
- **Package outputs:** the format name is the output's `format`, the target is `formats/<output id>.md`, and each formatter also gets that output's brief and counts from package.json. When every format file is written, `.prism-kit/run.sh packages check <slug>` must print OK (every file there, the right number of posts and stories, email and brochure layouts) before anything opens or builds; fix what it lists in that format file.
- Before formatting: copy the project's `images/` folder (with its `.focus.json`) into `formats/images/`. Pass every formatter the output of `.prism-kit/run.sh library <brand>`. Where a piece needs a photo it doesn't have, use a fitting photo from the brand's image library (`![](brand:<id>)`); only when none fits, write the brand's test image, `![](prism:placeholder)` (light grounds) or `![](prism:placeholder-dark)` (dark); the build fills them from the brand, with neutral ones when it has none. Logos are `![](prism:logo)` and `![](prism:logo-on-dark)`. Pass the path of `images.md` to every formatter when it exists.

<!-- claude-only -->
## 1b. Open design mode (every format, before building)

As soon as the format files exist, open the canvas with one board per format file (`references/wireframe.md`: one wire command builds every board and the canvas index, one publish sends them) without asking, and say in one line that it is open and that "done" exports the files. **Do not build or deliver anything before the first "done"**; follow "Design session" in section 4. A later session picks up where this one stopped: `.prism-kit/run.sh state <slug> show` names the canvas, what was exported and what changed since.

**A package opens as one set.** After approval, every output of the package opens side by side on the one canvas (one board per format file, in package.json's order), titled "<piece title> · <package name>", so the set is seen and edited together. Each output can be edited on its own; only a changed number or a new claim is flagged (section 4).

Go straight to step 2 instead in quick mode, when the person asked for the files without design mode ("just build it", "skip design mode"), or when the session is unattended. "Design mode", "open the canvas" or "edit visually" later opens it for whatever exists, and the design session rules apply from then on.

<!-- /claude-only -->
## 2. Build and check

For each format file:

**Naming.** Every exported file starts with the piece's tag, `<slug>-<output>-v<version>`, so files from different pieces, outputs and rounds never mix in a downloads folder, a CMS or an ESP image library: `cedar-hollow-sheet-v3.pdf`, `cedar-hollow-html-email-v3.html`, `cedar-hollow-social-v2-post-01.png`. `.prism-kit/run.sh tag formats/<format>.md` prints it (slug from the project folder, output from the format file, version from content.md). Folder builds apply it to every file inside, images too; for sheet, brochure and deck, pass `out/<tag>.<ext>`. Source files (content.md, formats/) keep their names.


1. **Number check:** `.prism-kit/run.sh check content.md formats/<format>.md`. Any number not in content.md is a stray. Remove or correct it in the format file (content.md wins); never add it to content.md without asking the user.
2. **Build:**
   - sheet: `.prism-kit/run.sh sheet formats/sheet.md out/<tag>.pdf`
   - brochure: `.prism-kit/run.sh sheet formats/brochure.md out/<tag>.pdf` (the `layout: brochure` front matter switches the builder)
   - blog: `.prism-kit/run.sh blog formats/blog.md out/blog` (`<tag>-header.png`, chart PNGs, `<tag>-post.md` and `.html` for the CMS)
   - deck: `.prism-kit/run.sh deck formats/deck.md out/<tag>.pptx`
   - html-email: `.prism-kit/run.sh email formats/html-email.md out/html-email` (`<tag>.html`, `<tag>.txt`, images/, `<tag>-images.zip`, `<tag>-preview.png`). It prints `[email]` warnings; act on each (the card lists them). Look at preview.png in the visual check: all four views, light and dark, nothing unreadable in dark mode.
   - package outputs: the command for the output's format, with `formats/<output id>.md`, and folder builds into `out/<output id>` (`.prism-kit/run.sh social formats/story.md out/story`), so outputs of one format never share a folder.
   - social / email / carousel: `.prism-kit/run.sh social formats/<format>.md out/<format>` (`<tag>-<id>.png` plus `<tag>-captions.md`). It exits with an error and prints `[social] missing caption: <id>` when a post has no caption; fix the format file and rebuild. Read captions.md once before delivering.
3. **Build warnings:** act on every line the build prints before looking at anything:
   - `[deck] slide N (<layout>): <part> may not fit`: shorten that text or split the slide;
   - `[sheet] brochure page N, panel N: content runs ... past the panel bottom`: cut words, then an image;
   - `[social] story <id>: ... outside the safe area` or `runs into the logo`: shorten that text. For stories, build with `--guides` and look at `_guides/` in the visual check.
4. **Visual check:** `.prism-kit/run.sh preview out/<tag>-preview.png <built files>` and look at the image. Fix in the format file and rebuild, at most two rounds:
   - brochure: exactly two pages, nothing cut off at a panel bottom (panels clip, they don't overflow);
   - page count: a sheet asked for as a one-pager must be one page. Follow "Fitting a one-pager" in the sheet card: compact hero and closing card first, then cut content. Never shrink type or margins any other way. Say what was cut;
   - text cut off, overlapping or running past a post or slide edge;
   - a heading stranded at a page bottom, empty or near-empty pages, a closing card alone on a page when trimming a line would pull it back;
   - one-word last lines in large headings (use `\ ` non-breaking space);
   - missing fictional labels when `figures: illustrative`;
   - images: the build prints `[sheet] low resolution` or `missing image` warnings, and `[deck]` equivalents. Fix a missing path; report low-resolution images to the user with the size they print at, and move them to a smaller layout (gallery, media row) or drop them from print;
   - the brand digest's placement rules (for example, no section ornament directly above or beside a photo of a person or a quote, one dark card at most, no mono text on dark); a portrait photo not squeezed into a landscape slot.
5. **Verify:** `.prism-kit/run.sh verify out/<file>` for each PDF and PPTX, and `out/<format>` for image and HTML email folders; add `--brand <brand>` when the piece is not in the default brand. `FAIL` means the file was not built by the kit or uses non-brand fonts: rebuild it through `run.sh`; never deliver a failing file.
6. **Package:** `.prism-kit/run.sh packages check <slug> --built` (every output built, page counts as the package asks: a one-pager on one page, a multipage PDF on at least its pages) and `.prism-kit/run.sh packages claims <slug>` (no output claims what content.md doesn't) must both print OK. Fix and rebuild what they list; a claim still open from "Packages: edit each output freely, flag claims" in section 4 waits for the person's answer.
7. Record in log.md: files built, cuts made by each formatter, check and verify results.

## 3. Deliver

- **A package goes out as one zip.** Once every output is verified, `.prism-kit/run.sh packages zip <slug>` writes `out/<slug>-<package>-v<version>.zip`: a folder per output with its files (captions files, the email's HTML, text, images and images zip, the blog's post and header), the deck's font pack when one was made (make it first, below), and `CONTENTS.txt`. Deliver that zip and the preview contact sheets, not the files one by one; every later export is a new zip at the new version. When the set was a one-off (`from: this piece` in package.json) or the person changed a package, offer once to save it as a package for everyone (the prism-onboard skill, "A package"). The rest of this section (each file's job, revisions) applies to the files inside it.
- Send the built files with SendUserFile: PDF, PPTX, PNGs (all images for social/email/carousel), each captions file, and the preview contact sheets. HTML email: the `.html`, the images zip, the `.txt` and the preview. If a folder from the user's computer is connected, also write content.md, the format files and out/ there.
- Asked for Illustrator, Canva, InDesign, .ai, .indd or "editable" files: Prism does not send files for editing elsewhere. Say in one line that layout and wording changes are made here and rebuilt, then ask what should change.
<!-- claude-only -->
- Remind the person in one line that the design canvas is open and now matches these files, and that any change they ask for (on the canvas or in chat) is exported again straight away.
<!-- /claude-only -->
- Name each file's job in the message, one line each, so nobody mistakes the source for a deliverable:
  - the PDF, PPTX or PNGs: the finished piece;
  - the captions file: the post copy to paste with each image (email: subject line and preheader);
  - HTML email: in the sending tool (content.md's `Send from:`, else the brand's email tool from `run.sh brands`), upload the `.html` and the images zip beside it (or paste the `.html` into any tool once `images/` is uploaded to the `image-base` folder), `email.txt` for the plain-text part, `preview.png` to check light and dark. Say which merge tags passed through, and that a test send to Outlook, Gmail and Apple Mail is the last check;
  - `formats/<format>.md`: the editable source for that output. For social it holds both the image text and the caption; edit it and ask for a rebuild rather than editing captions.md.
- Message: one line per output, what each formatter cut, and any check the build could not fix. Remind deck users once that decks need the brand's Office fonts installed to present; the first time a deck is delivered, make the pack with `.prism-kit/run.sh fonts out/<brand>-fonts.zip <brand>` and send it.
- Say how revisions work: reply with changes, or upload an edited content.md or format file.

## 4. Revisions: route every edit to one of two lanes

Classify each requested change before touching files. Tell the user the lane in one line when it is not obvious.

**Content lane** (wording, facts, numbers, quotes, adding or removing a point):

1. Edit content.md (or take the uploaded one, keeping `content.v<n>.md`). Bump `version` and add one line per change to the `changes:` list in its front matter (`"v<n> · <what changed>"`), layout changes included. Log the diff.
2. If numbers, quotes or claims changed, run **prism-reviewer** on the changed sections and update claims.md. Show new flags; for anything beyond a typo, get the user's OK before continuing (the proof stop applies to changes too).
3. Patch every existing format file: run **prism-formatter** in mode `patch` per format (parallel when several), passing the change. Never regenerate from scratch; that would discard layout the user already approved.
4. Number check, rebuild all affected formats, preview, deliver.

**Layout lane** (move, resize, split, merge, restyle, pick a different component, dark vs light, chart type):

1. Edit only that format file yourself, and add the change to content.md's `changes:` list (content.md's words stay as they are).
2. Number check, rebuild that format only, preview, deliver.

**Uploaded format file:** compare its wording against content.md. Pure layout changes: layout lane. Wording changes: ask once whether they should go back into content.md so the other outputs match; if yes, content lane; if no, keep them in that format only and note it in log.md.

**Packages: edit each output freely, flag claims.** In a package each output can be edited on its own (rewording, cuts, a shorter headline, layout), in design mode or in chat, and the edit stays in that output: it is not carried into content.md or the other outputs, and you don't ask whether it should be. The one exception is a claim. After every edit to an output, run `.prism-kit/run.sh packages claims <slug>` and read the changed passages against claims.md:

1. **A changed number** (a number the output states that content.md doesn't) or **a new claim** (a quote, capability, customer name or result that isn't in claims.md) is flagged. List it under "Needs your call" with the output and the passage, and offer two answers: make it the approved claim (content lane: content.md and claims.md, the reviewer, then patched into every output that carries it, which the claims table lists), or keep the approved one in this output.
2. The flagged output isn't exported until the person answers; the other outputs carry on.
3. Cuts are never flagged: a story carries one result, the PDF all of them.
4. "Do the same in the others" applies a layout or wording edit to every output where it fits.

**Vet every edit** (from chat, an uploaded file or a visual edit), before the rebuild:

1. `.prism-kit/run.sh vet formats/<format>.md --was <previous version> --fix` (keep a copy of the file before editing it; for content.md, `--was content.v<n>.md`). `--fix` renumbers numbered headings to their new order, and removes doubled words and stray spaces. It reports what it cannot decide: a heading left without its text, a count heading that no longer matches ("Four findings" over three items), a note to the editor, an em dash or hype word, unbalanced `*`.
2. Proofread every `CHANGED` passage yourself, word by word: spelling, grammar, capitalisation, punctuation, a sentence broken by a cut, an accent word lost from a heading.
3. Fix without asking, and report each fix: spelling and grammar slips, numbering, doubled words, spacing, punctuation, em dashes, a heading moved away from its paragraph, a count heading that no longer matches.
4. Never change meaning without asking: numbers, names, quotes, claims, product terms. A word that may be deliberate (jargon, a name, a spelling the person used twice) stays and goes under "Needs your call".
5. Notes to the editor, test lines and placeholders ("delete me", TODO, XX, lorem ipsum) are not copy: leave them out of the build and list them under "Left out".

**Read back** after every revision, in this order, one line each and skipping empty parts:

- **What you changed**: moves, cuts, rewordings (was → now), additions.
- **Fixed for you**: every fix from the vet, was → now.
- **Left out**: notes and test lines; one reply puts any of them back.
- **Needs your call**: meaning questions, and any number the check could not match to the source.

<!-- claude-only -->
**Design session** (from opening design mode until it is closed). The canvas and the Markdown are one piece of work. Until the first "done" nothing is built; after it, every change is exported again straight away (`state <slug> show` says which of the two the session is in):

1. **Before the first "done": no files.** Never build, preview or deliver a PDF, PPTX or PNG, whatever the request sounds like ("make slide 4 cards", "change the headline"). A request in chat is an edit to the session, not a build order.
2. **Every request starts with a pull check.** List the canvas's files and run `state <slug> pull-needed --version <id>`; on `pull`, read the boards back and run `wire-diff --apply` ("Read the edits back" in `references/wireframe.md`), so what the person already changed on the canvas is kept and never overwritten by a republish. On `skip`, nobody saved the canvas since your last publish: go straight on.
3. **Then apply the request** through its lane (a layout change such as "make this slide cards" edits the format file; a wording or link change goes into content.md and every format file). A different icon ("use a calendar icon on the second card") is a layout change: swap the `ph-` name in the format file. Vet the result.
4. **Record everything in content.md.** Bump `version`, keep the previous file as `content.v<n>.md`, and add the round to the `changes:` list in its front matter: one line per change, canvas edits and chat requests alike, layout included (content.md is where the person looks for what changed; formatters ignore this field; `state show` lists the lines since each format's last export):
   ```yaml
   version: 4
   changes:
     - "v4 · canvas: slide 3 moved above slide 2"
     - "v4 · canvas: 'Where intake got stuck' reworded to 'Where intake stalled'"
     - "v4 · chat: slide 4 laid out as feature cards"
     - "v4 · fixed: 'recieve' to 'receive' on slide 5"
   ```
5. **Republish the changed boards** ("Republish the boards" in `references/wireframe.md`) and record the version. The new boards become the baseline for the next pull.
6. **Read back** with the four-part message below, then say that the canvas is updated and that "done" exports the files (before the first export) or which files were exported again (after it).
7. **"Done":** a last pull check and vet, then step 2 (build, check, verify) and step 3 (deliver), with the full list of changes since the last export from content.md. Record each export (`state <slug> export <format> <files>`) and republish every exported board stamped "Exported v<n> · <date>", so the canvas matches the files. A package exports every output and ends with its zip; a later change exports what it touched and makes a new zip of the whole set.
8. **After the first export, no more "done".** Each later change request runs the same loop and ends with step 7 for the formats it touched: export, record, republish, deliver, read back. Design mode stays open until the person closes it (`state <slug> close`).

<!-- /claude-only -->
**New export later** ("also make a carousel"): step 1 in create mode for that export only.

**New images later** (uploaded after approval, during design mode or after delivery):

1. Normalise and look at them as in the prism-draft skill's Images steps (`.prism-kit/run.sh images <slug>/images <files>`, then copy the new files and `.focus.json` into `formats/images/`), and add their rows to images.md. Ask only what you can't see: who the people are and whether there is permission, when anyone is identifiable.
2. A caption is content: add the image line to content.md in its section (content lane, vetted like any edit). Then place the image in each format the person named, or in every format where it fits, as the component that suits its orientation and print fit (layout lane).
3. Each photo is cropped to its slot around its focal point. "Keep her face in frame", "show more of the building": change that image's focus in images.md and `.focus.json` (every format), or write `{focus="x% y%"}` on it in one format file (that format only).
4. In design mode, republish the changed boards; otherwise number check, rebuild, deliver.
5. A photo worth reusing across pieces belongs in the brand's design system photo library; say so once.
