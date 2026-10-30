# Prism tutorial: how to use the plugin
<!-- tutorial-reviewed: 1.3 -->

Give this rundown when someone asks how to use Prism ("how does this work", "tutorial", "what can you do"). Present it in your own words, short and scannable: a two-line intro, then the sections below as brief headed lists. When they ask about one part ("how does design mode work", "tell me about quick mode"), give only that section, in a little more depth. Never invent features; everything Prism does is in this file. End by offering a next step that fits: "Paste some notes and say 'draft this into a one-pager'", try quick mode, or the guided walkthrough (`/prism-tutorial` with no topic, in `walkthrough.md`), which makes a sample piece through every stage.

## What Prism is

Prism turns raw material (notes, a transcript, a document, photos) into proofed, on-brand files: one sheets, briefs, case studies, trifold brochures, 5x7 cards (postcards, invitations, mailers), PowerPoint decks, blog posts and headers, social posts, Instagram stories, carousels, email header images, whole HTML emails, short animated films, website illustrations (animated UI mockups for a feature page) and whole website pages (block markup for the brand's WordPress site). The words are written and approved once, in `content.md`, and every format is laid out from them, so nothing drifts and no number appears that isn't in the approved words. Brands come from the kit: list them with `.prism-kit/run.sh brands` (it marks the default) when presenting this; a piece picks one with `brand:`.

## Two ways to work

| | Full process | Quick mode |
|---|---|---|
| Start with | "Draft this into a case study" | "Quick one-pager from these notes" |
| Questions | A short interview (every question skippable) | None |
| Proof | You approve the words before anything is designed | After delivery: every number and claim is listed for you to check |
| Outputs | Any mix of formats, or a package, from the same approved words | One file in one pass |
| Later | Revisions keep the layouts you approved | Say "full proof" to move it into the full process |

## The full process, step by step

1. **Bring material.** Paste or attach notes, a transcript, a Word or PDF document, and any photos. Audio isn't accepted; send a transcript instead.
2. **Interview.** Prism asks only what it doesn't know yet: audience, length, which outputs, and photos (upload now, use the brand's photo library, add later, or none). Skip anything; answer it later ("make it shorter", "also a deck"). Your answers stay private to the piece.
<!-- claude-only -->
   Want every question up front instead? Start with `/prism-interview`, or say "interview me first".
<!-- /claude-only -->
3. **Draft and review.** A writer produces `content.md` (the words) and `claims.md` (every number, quote and claim with its source). A reviewer flags anything uncertain; it never rewrites your copy.
4. **Proof.**
<!-- claude-only -->
   The draft opens in a Claude Doc: edit the words directly, reply to the reviewer's "Check:" comments, or describe changes in chat. A Claims tab lists every claim.
<!-- /claude-only -->
   Reply with changes, or edit content.md and upload it. Say **"approve"** when the words are right. Approval is refused while flags remain open, unless you say "keep it as is". Nothing is designed before this.
5. **Produce.** Name the outputs ("produce a sheet and a carousel") or let the ones from the interview start on their own. One formatter per output lays out the approved words.
<!-- claude-only -->
6. **Design mode.** A wireframe of every format opens on a Claude Design canvas: the real words, real icons, link addresses in blue chips, the brand's touches sketched in grey. Retype text, drag blocks or slides into a new order, delete what should go, or describe changes in chat. Say **"done"** and the files are exported in the brand styles, and the canvas updates to match. After that, every change you ask for is exported again straight away. Say "just build it" to skip design mode.
<!-- /claude-only -->
7. **Delivery.** Every file is number-checked against the approved words, built, previewed and brand-verified before it reaches you, with a note of what each formatter had to cut.

## Packages

A package is a set number of finished files from one approved piece, so nobody has to remember every asset. List them with `.prism-kit/run.sh packages` when presenting this (a brand can add its own). Say "draft this into a case study package": the case study package is two social posts with their captions, a story, a blog post, a PowerPoint deck, a one-pager, the full multipage case study PDF and an HTML email; a demo follow-up package is a takeaway PDF and a follow-up email. Change the set as you ask ("no deck", "three posts"), or describe a set of your own for one piece.

Make your own: say "make a package" (or "save this as a package" after a piece). Prism asks what it holds, writes the definition, and you add it to the brand's design system, where everyone on the team gets it.

- The words are written and proofed once, for the whole set.
<!-- claude-only -->
- After approval, every output opens side by side in design mode.
<!-- /claude-only -->
- Edit each output on its own (reword, cut, rearrange); the edit stays in that output. Only a changed number or a new claim is flagged, and you choose: make it the approved claim in every output that carries it, or keep the approved one.
- Everything is delivered as one zip, a folder per output, and every later export is a new zip.

## Revising

- **Wording, facts, numbers, links:** change them once; they go into content.md and every output, keeping your layouts.
- **Layout** (move, split, restyle, a different icon, dark vs light): touches only that one output.
- **Every edit is proofread.** Typos, numbering and doubled words are fixed and reported; meaning (numbers, names, quotes, claims) never changes without asking. Each revision ends with a read-back: what changed, what was fixed for you, what was left out, what needs your call.

<!-- claude-only -->
## Work together

- Say "work on this with @Dana" at any point. Prism gives you the links to share (Share at the top of the proof doc and the design canvas → add Dana as Editor); it can't share for you.
- Teammates don't need Prism. They edit the words or the canvas directly, or leave a comment starting **@claude** ("@claude shorten this headline"). Your Prism applies it, checks it and answers in the thread; changes to numbers, names, quotes or claims still come to you.
- Only you approve, say "done", export or add outputs. When a teammate says "done", you're told.
- After each export the files go on an Exports page your teammates can open.
- Requests wait while your session is closed and are applied when it next runs.

<!-- /claude-only -->
## Photos

- Upload them with the notes or at any point later. You'll be asked which one leads, which to use, and whether the people in them can be shown; clients or minors without confirmed consent are left out.
- Every layout crops a photo around its focal point (found automatically). If one misses, say "keep her face in frame".
- Reusable shots (team, office, product) belong in the brand's design system photo library, so any piece can use them.
- Send the largest file you have: anything that prints under 150 dpi moves to a smaller layout or stays out of print.
- Product screenshots can go in a phone, tablet or laptop mockup in any format ("put the intake screen in a laptop"); in decks the device can run off the slide's edge, with a phone layered in front of a laptop.
- Location and camera details are removed from every photo, so no exported file says where a picture was taken.

## Add a brand

Prism builds in any brand whose design system has a `tokens.json`. Say "add a brand" and upload the design system's files:
<!-- claude-only -->
or give its Claude Design System link.
<!-- /claude-only -->

1. A few questions: the design system, the brand name, and the defaults for its pieces (audience, contact line, email tool). Only the design system is needed.
2. Prism maps its core roles (colours, fonts, type, spacing, corners, logos) to the design system's own names, and writes the brand rules every writer and reviewer follows. The design system itself is never changed.
3. The swatch sheet shows every mapping, the type, the email colours in light and Outlook dark, and a sample of every layout in the brand. Ask for changes; it rebuilds each time.
<!-- claude-only -->
   It opens in design mode first as a lo-fi board; say "export" for the full styles. Start with `/prism-onboard` if you like.
<!-- /claude-only -->
4. Say **"done"** for the brand bundle. It goes to the Prism maintainer and ships with the next release; until then the brand works where it was made, as a draft (name it with `brand:` in a piece).

When a brand's design system changes, the same skill updates it and shows only what moved.

## Good to know

- Decks need the brand's Office fonts installed to present; the first deck comes with the font pack.
- Print copies: ask for a "print version" of a sheet, brochure or 5x7 card and it comes on a plain white page as well (the glow stays), so office printers don't tint the paper.
- HTML emails come with the HTML, an images zip, a plain-text version and light and dark previews; merge tags pass through untouched.
- Logos: ask for the logo anywhere ("logo at the top right of the closing card", "logo next to the stats") and it lands in the same spot, at the same size, every time, in the right version for a dark or light background.
- QR codes: give the address to scan ("add a QR code for the sign-up page") and it's drawn black on white, beside the text or centred above it (a black or clear background on request). Upload your own code (a tracked one, say) to use it instead. HTML emails link the address rather than show a code.
<!-- claude-only -->
- Animated films: ask for an animated film ("a 15-second animated story of the results") and Prism writes a direction script from the approved words (a technique such as a stat story or kinetic type, scene by scene), Claude makes the film with Claude Motion in the brand's colours, fonts, icons, motif and logo: each scene on its own brand ground with a moving backdrop, everything arriving and leaving, and transitions (wipes, irises, slides, blinds) instead of hard cuts. Each scene holds long enough to read once everything has arrived (longer for more words). Prism checks every line and number in it, every transition seam and every scene's colours, and shows you stills. Review it on the film's own page (comments pin to a moment), and **Export** there saves the MP4. Films need Claude Motion (Team and Enterprise plans) and skip design mode.
- Website illustrations: ask for a website illustration of a feature ("an illustration of case monitoring for the features page") and Prism lays out an abstract, glassy UI mockup of that one feature from the approved words: the rows or fields that matter, placeholders for the rest, tethers between modules, a story that plays once in about 5 seconds when it scrolls into view and ends still. You get the single HTML block for the website (dark and light), a bench page to preview it live beside its heading and copy, and still frames. Illustrations skip design mode: the bench is where you review them.
- Website pages: ask for a website page ("turn this into a landing page for the site") and Prism lays the approved words out as a whole page: a hero, sections that each open with a heading and alternate sides down the page, feature cards, a band that sums it up, the closing card and an FAQ. You get the block markup to paste into a new draft in WordPress (the Code editor), a page file with its template, search title, description and image slots, and your photos ready to upload. A brand with its own site components gets those, so the pasted page stays editable like the rest of the site; any other brand gets plain WordPress blocks. Review the layout in design mode; the draft on the site is the real preview, and it stays a draft until you publish it. If someone edits the page in WordPress, send its markup back before the next rebuild and Prism lists what changed, so the edits carry over.
- Walkthrough films: ask for a walkthrough ("a walkthrough video of adding a referral") and upload screenshots of the pages it passes through. Prism asks for anything missing first (a screenshot of each page and of the phone layout if it switches to one, whether the screenshots show demo or real data, the call to action), then Motion rebuilds the app from the screenshots as live screens: an opening title, the app building in, numbered steps with a step card that tucks itself away, a cursor that settles before it clicks, the camera pushing in on each action and pulling back out, and an end card that recaps the steps. Moving from the desktop to the phone layout reshapes the screen instead of cutting. Anything assumed, such as a web address nobody confirmed, is flagged when it's delivered.
<!-- /claude-only -->
- "Editable" Illustrator, Canva or InDesign files aren't offered: changes are made here and rebuilt.
- Quick mode isn't proofed. Treat it as a draft until someone has checked its claims list.
<!-- claude-only -->
- Design mode is Claude only, and not in quick mode; say "design mode" after a quick run to open it.
- `/prism-tutorial` walks you through a sample piece in the default brand, stage by stage: the sample prompt and notes, the interview, the draft, the proof in Claude Docs, design mode in Claude Design, the export, then the same words as a deck, a carousel or an animated film (`.prism-kit/run.sh tutorial` sets the sample up). `/prism-tutorial rundown` brings this rundown back; add a topic (`/prism-tutorial photos`) for just that part.
<!-- /claude-only -->

## Try it

- "Draft this into a case study. I want a sheet, a brochure and three posts."
- "Draft this into a case study package, but skip the deck."
- "Quick one sheet from these notes, for supervisors, ending on a demo invite."
- "Make a 5x7 card inviting partners to the open house: photo on the front, a mailer back."
- "Make a trifold with the left + spread inside layout."
- "Also make a 15-second animated film of the results for Instagram stories."
- "Make a walkthrough video of writing a visit note. Here are the screenshots."
