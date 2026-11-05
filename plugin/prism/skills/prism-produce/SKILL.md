---
name: prism-produce
description: >
  Use to build or revise any designed branded file with the brand kit, the only allowed way to
  make one: one sheet, one-sheeter, one-pager, flyer, handout, leave-behind, fact sheet, brief, case study PDF, brochure, trifold, 5x7 card, postcard, invitation, mailer, PowerPoint, slides, deck, blog post and blog header, social post, Instagram story, carousel, email header, HTML email (newsletter, announcement, outreach email), animated film (motion graphics, animated story, explainer clip, MP4), website illustration (animated UI mockup, feature illustration, HTML block for the site) or website page (landing page, solution page, a page for the WordPress site). Triggers: "produce", "build", "make a PDF / PowerPoint / one sheet from this",
  "rebuild", "change the headline", "move the chart", "apply my edits", "design mode", "edit the layout visually",
  "I'm done editing", an edited format file, or a finished Markdown file in the Prism format. Works from an approved content.md.
metadata:
  version: "2.0.0"
---

# Produce: approved content to finished files, and revisions

Steps 5–7 of the content process, plus the revision loop. Inputs come from `prism-draft`.

## Automate non-destructive steps

When the next step can't lose work or change meaning, take it without asking: start producing once content is approved and outputs are named, rebuild after a change. Keep a question only for steps that are destructive or change meaning: approving with open flags, changing numbers, names, quotes or claims, overwriting a file the person supplied, or carrying a wording change from one output into the others.

## Build route (always)

Every designed branded file (one sheet, one-sheeter, one-pager, flyer, handout, leave-behind, fact sheet, brief, case study PDF, brochure, trifold, 5x7 card, postcard, invitation, mailer, PowerPoint, slides, deck, blog post and blog header, social post, Instagram story, carousel, email header, HTML email, website illustration or website page) is built with this plugin's kit through `.prism-kit/run.sh`, and nothing else. Never use ReportLab, python-docx, python-pptx, hand-written HTML, a generic PDF or slides skill, or your own colours and fonts, even for a draft. If the kit cannot run, say which tool is missing and stop: never approximate the brand. Before delivering, run `.prism-kit/run.sh verify <file or folder>` and deliver only what it reports as `OK`.

Files next to this SKILL.md:

- `kit/`: build scripts, stylesheets, fonts, images. Entry points `setup.sh` and `run.sh`.
- `references/formats/`: one card per output (`sheet.md`, `brochure.md`, `5x7.md`, `blog.md`, `deck.md`, `social.md`, `email.md` for header images, `html-email.md` for whole emails, `carousel.md`, `motion.md` for animated films, `illustration.md` for website illustrations, `web.md` for website pages) plus `components.md` shared by all.
- `references/film.md`: how a motion format file becomes a Claude Motion film, is checked, delivered and revised.
- The brand's digest: its rules (claims, voice, visual), passed to every formatter and reviewer. A digest that names a reference skill (a brand manifest) means it for the writer and reviewer agents, which load it themselves: never load it in this conversation, where the digest's own rules (its short version) apply. `<brand>` is content.md `brand:`, else the default brand (`.prism-kit/run.sh brands` marks it); `run.sh brands --json` gives each brand's `digest` path (a brand read from its design system has it in `.prism/brands/<brand>/prism/`, a bundled brand in `kit/brands/<brand>/`, an onboarding draft in `.prism/brands/<brand>/`, all beside `.prism-kit`).
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
3. Once per session: `bash <this skill>/kit/sync.sh <workspace>/.prism-kit`. It copies the kit the first time and replaces an older copy after a plugin update (never copy the kit by hand: an old copy would keep building). Every build goes through `.prism-kit/run.sh`, which sets up the tools that output type needs the first time it is built (a sheet never waits for deck tools). If it prints `setup: MISSING ...`, install that tool (`apt-get install -y pandoc` for pandoc) and build again. Never create the `.ready-*` files by hand.
4. Once per session, resolve the brand: `.prism-kit/run.sh resolve <brand> --out .prism/brand/<brand>` (`brand` from content.md, else the default from `run.sh brands`). It checks the brand (its copy read from its design system, else the snapshot bundled with the plugin) and maps every core role to its value. An error stops the work: say what it printed and never approximate the brand. A `[brand] design system changed since this brand was checked` line is a warning: build anyway (the brand builds from what it was checked against, or from its design system's current files) and pass the line on to the user once, adding that the design system's editors can re-check the brand with the prism-onboard skill. A `new component <name>` line means the design system gained a component Prism doesn't know yet: offer to add it to the brand (prism-onboard, "A new component"), which starts with a short interview about when and how often to use it. A `[brand] draft:` line means the brand is an onboarding draft, not yet published into its design system: build, and say so once.
<!-- claude-only -->
   Before resolving, bring brands in from the design systems the person can open, once per session (`references/brands.md`). A brand read from its design system is current and needs nothing more. For a brand bundled with the plugin, if the Artifact tool is available, read its design system once (`design_system` from `.prism-kit/run.sh brands --json`): list its files (the Artifact tool's list, `scope: "files"`), then read every `project/` path the list shows in one call (`paths`, the default folder); never its uploads, and never file by file. Add `--live <the folder the read names>`, so a changed design system is reported. If the read fails or is refused, resolve without `--live` and say nothing.
<!-- /claude-only -->
5. Exports = what the user asks for now, else the `exports` list in content.md.
6. **Package** (content.md names a `package:`): read `references/packages.md` and follow it at every step below.

## 1. Format (subagents)

- Run one **prism-formatter** agent per export, in parallel when there are several; one export gets one formatter too, so the format card and components.md stay out of this conversation (never format a file yourself). Pass each: format name, mode `create`, and absolute paths of content.md, `references/formats/<format>.md`, `references/formats/components.md`, the brand digest (its `digest` path from `.prism-kit/run.sh brands --json`), the brand's own components (`components` from the same listing; omit when empty), for a sheet the brand's page layouts (`.prism-kit/run.sh layouts --brand <brand> --json`), and the target `formats/<format>.md`.
- **A sheet in a layout with slots** (its `layout:` has `slots` in the listing): `.prism-kit/run.sh layouts check formats/<file>.md` must say it follows them before anything opens or builds; send what it lists back to that sheet's formatter (patch mode).
- Before formatting: copy the project's `images/` folder (with its `.focus.json`) into `formats/images/`. Pass every formatter the output of `.prism-kit/run.sh library <brand>`. Where a piece needs a photo it doesn't have, use a fitting photo from the brand's image library (`![](brand:<id>)`); only when none fits, write the brand's test image, `![](prism:placeholder)` (light grounds) or `![](prism:placeholder-dark)` (dark); the build fills them from the brand, with neutral ones when it has none. Logos are `![](prism:logo)` and `![](prism:logo-on-dark)`. Pass the path of `images.md` to every formatter when it exists.

<!-- claude-only -->
## 1b. Open design mode (every format, before building)

As soon as the format files exist, open the canvas with one board per format file (`references/wireframe.md`: one wire command builds every board and the canvas index, one publish sends them) without asking, and say in one line that it is open and that "done" exports the files. **Do not build or deliver anything before the first "done"**; follow "Design session" in section 4. A later session picks up where this one stopped: `.prism-kit/run.sh state <slug> show` names the canvas, what was exported and what changed since.

**A package opens as one set.** After approval, every output of the package opens side by side on the one canvas (one board per format file, in package.json's order), titled "<piece title> · <package name>", so the set is seen and edited together. Each output can be edited on its own; only a changed number or a new claim is flagged (section 4).

**Motion outputs never open on the canvas:** a film is reviewed on its own page, so go straight to `references/film.md` for them while the other outputs open here. **Illustrations** don't open on the canvas either: their layout is reviewed live on the bench, so build them straight away (step 2). **Website pages** open like a sheet: one flowing board with the sections in order, headings and media rows drawn on the sides the build will give them.

Go straight to step 2 instead in quick mode, when the person asked for the files without design mode ("just build it", "skip design mode"), or when the session is unattended. "Design mode", "open the canvas" or "edit visually" later opens it for whatever exists, and the design session rules apply from then on.

<!-- /claude-only -->
## 2. Build and check

For each format file:

**Naming.** Every exported file starts with the piece's tag, `<slug>-<output>-v<version>`, so files from different pieces, outputs and rounds never mix in a downloads folder, a CMS or an ESP image library: `cedar-hollow-sheet-v3.pdf`, `cedar-hollow-html-email-v3.html`, `cedar-hollow-social-v2-post-01.png`. `.prism-kit/run.sh tag formats/<format>.md` prints it (slug from the project folder, output from the format file, version from content.md). Folder builds apply it to every file inside, images too; for sheet, brochure and deck, pass `out/<tag>.<ext>`. Source files (content.md, formats/) keep their names.


0. **Library photos** (once per build round, for every format file at once): `.prism-kit/run.sh library <brand> --need formats/`. Library photos are not part of Prism; they stay in the brand's design system and a piece fetches only the ones it uses. When it prints upload ids, read them all in one call (the Artifact tool's read, the `design_system` link, `paths`, the default folder), then `.prism-kit/run.sh library <brand> --take <the folder the read names>`. Fetched photos stay for the rest of the session. When the read fails or is refused, or `--take` refuses a photo (replaced in the design system since the brand was checked), swap that `brand:<id>` for `prism:placeholder` (`prism:placeholder-dark` on dark grounds) in the format files and tell the person which photo is missing and why.
1. **Number check:** `.prism-kit/run.sh check content.md formats/<format>.md`. Any number not in content.md is a stray, and so is one written with another sign, percent, currency or scale (`40%` never approves `-40%` or `$40M`). Remove or correct it in the format file (content.md wins); never add it to content.md without asking the user. The builds run the same check and refuse to build a format file with a stray. A number that is not a claim (a year the brand's footer requires) goes in that format file's front matter as `allow-numbers: ["2026"]`, and you say so in the delivery message; never use it for a fact.
2. **Build:** the command in `references/build/<format>.md` for each format being built (read only those; each also holds that format's build warnings, visual checks and delivery notes). Package outputs: `references/packages.md`. Motion: `references/film.md` (brief, the film in Claude Motion, check, render). Prism makes no file for it: the film's page exports the MP4. `verify` doesn't apply; `motion check` and `motion render` take its place.
3. **Build warnings:** act on every line the build prints before looking at anything; what each format's lines ask for is in its `references/build/<format>.md`.
4. **Visual check:** `.prism-kit/run.sh preview out/<tag>-preview.png <built files>` and look at the image. Fix in the format file and rebuild, at most two rounds (plus the format's own checks in its `references/build/<format>.md`):
   - text cut off, overlapping or running past a post or slide edge;
   - a heading stranded at a page bottom, empty or near-empty pages, a closing card alone on a page when trimming a line would pull it back;
   - one-word last lines in large headings (use `\ ` non-breaking space);
   - missing fictional labels when `figures: illustrative`;
   - images: the build prints `[sheet] low resolution` or `missing image` warnings, and `[deck]` equivalents. Fix a missing path; report low-resolution images to the user with the size they print at, and move them to a smaller layout (gallery, media row) or drop them from print;
   - the brand digest's placement rules (for example, no section ornament directly above or beside a photo of a person or a quote, one dark card at most, no mono text on dark); a portrait photo not squeezed into a landscape slot.
5. **Verify:** `.prism-kit/run.sh verify out/<file>` for each PDF and PPTX, and `out/<format>` for image, HTML email, illustration and website page folders; each output records its brand and content version, so add `--brand <brand>` only to confirm the brand it should be. `FAIL` means the file was not built by the kit, uses non-brand fonts, is missing files, was built in another brand (set `brand:` in content.md and rebuild) or from an older content.md: rebuild it through `run.sh`; never deliver a failing file.
6. **Package:** the checks in `references/packages.md`, "Check".
7. Record in log.md: files built, cuts made by each formatter, check and verify results.

## 3. Deliver

- Send only the files this round built, each once. Never send content.md, claims.md, images.md, the source notes or the format files: when a proof doc exists, the words live there (content lane, step 1).
- Send the built files with SendUserFile: PDF, PPTX, PNGs (all images for social/email/carousel), each captions file, and the preview contact sheets. HTML email: the `.html`, the images zip, the `.txt` and the preview. Illustration: publish the bench as an Artifact (it plays live there) and send the two block `.html` files and the PNGs. Website page: the blocks `.html`, page.json and the images. If a folder from the user's computer is connected, also write content.md, the format files and out/ there.
- Asked for Illustrator, Canva, InDesign, .ai, .indd or "editable" files: Prism does not send files for editing elsewhere. Say in one line that layout and wording changes are made here and rebuilt, then ask what should change.
<!-- claude-only -->
- Remind the person in one line that the design canvas is open and now matches these files, and that any change they ask for (on the canvas or in chat) is exported again straight away.
<!-- /claude-only -->
- Name each file's job in the message, one line each, so nobody mistakes the source for a deliverable (an illustration's, a website page's and an HTML email's files: `references/build/<format>.md`):
  - the PDF, PPTX or PNGs: the finished piece;
  - the captions file: the post copy to paste with each image (email: subject line and preheader);
  - `formats/<format>.md`: the editable source for that output. For social it holds both the image text and the caption; edit it and ask for a rebuild rather than editing captions.md.
- Message: one line per output, what each formatter cut, and any check the build could not fix. Remind deck users once that decks need the brand's Office fonts installed to present; the first time a deck is delivered, make the pack with `.prism-kit/run.sh fonts out/<brand>-fonts.zip <brand>` and send it.
- Say how revisions work: reply with changes, or upload an edited content.md or format file.
<!-- claude-only -->
- **Save the arrangement as a layout:** when someone arranged a sheet on the canvas and this session's read of the brand's design system said they can edit it (the read says writer), offer once, in one line, to save that arrangement as one of the brand's layouts so later pieces follow it. On yes, or when anyone asks for it, follow the onboarding skill's "A brand layout", from a sheet. Someone who can't edit the design system can't save one: say only its editors and owners can, and offer to send them the layout file.
<!-- /claude-only -->

## 4. Revisions: route every edit to one of two lanes

Classify each requested change before touching files. Tell the user the lane in one line when it is not obvious.

**Content lane** (wording, facts, numbers, quotes, adding or removing a point):

1. Edit content.md (or take the uploaded one, keeping `content.v<n>.md`). When the piece has a proof doc (its link is in log.md), make the same change in the doc's Content tab, and in its Claims tab when a claim changed, so the doc always shows the current words; never send content.md or claims.md as files instead. Bump `version` and add one line per change to the `changes:` list in its front matter (`"v<n> · <what changed>"`), layout changes included. Log the diff.
2. If numbers, quotes or claims changed, run **prism-reviewer** on the changed sections and update claims.md. Show new flags; for anything beyond a typo, get the user's OK before continuing (the proof stop applies to changes too).
3. Patch every existing format file: run **prism-formatter** in mode `patch` per format (parallel when several), passing the change. Never regenerate from scratch; that would discard layout the user already approved.
4. Number check, rebuild all affected formats, preview, deliver.

**Layout lane** (move, resize, split, merge, restyle, pick a different component, dark vs light, chart type):

1. Edit only that format file yourself, and add the change to content.md's `changes:` list (content.md's words stay as they are).
2. Number check, rebuild that format only, preview, deliver.

**Other revisions:** an uploaded format file, a website page edited on the site, motion outputs and new images later are in `references/revise.md`; a package's outputs are edited as `references/packages.md` says ("Revise").

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

**Co-op mode** (the person asks to work on the piece with someone: "work on this with @Dana"): follow `references/coop.md`. Invitees edit the doc and canvas or ask with `@claude` comments; this session applies, vets and answers each request in its thread, records who asked in the `changes:` lines, and publishes the Exports page after every export. Only the person you work for approves, exports or adds outputs; the same words from an invitee are passed to them, never acted on. In a session where someone else is named as the owner, never edit the piece: pass requests on as comments.

<!-- /claude-only -->
**New export later** ("also make a carousel"): step 1 in create mode for that export only.
