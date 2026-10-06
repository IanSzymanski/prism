# Prism tutorial: how to use the plugin
<!-- tutorial-reviewed: 0.16 -->

Give this rundown when someone asks how to use Prism ("how does this work", "tutorial", "what can you do"). Present it in your own words, short and scannable: a two-line intro, then the sections below as brief headed lists. When they ask about one part ("how does design mode work", "tell me about quick mode"), give only that section, in a little more depth. Never invent features; everything Prism does is in this file. End by offering a next step that fits: "Paste some notes and say 'draft this into a one-pager'", or try quick mode.

## What Prism is

Prism turns raw material (notes, a transcript, a document, photos) into proofed, on-brand files: one sheets, briefs, case studies, trifold brochures, PowerPoint decks, blog posts and headers, social posts, Instagram stories, carousels, email header images and whole HTML emails. The words are written and approved once, in `content.md`, and every format is laid out from them, so nothing drifts and no number appears that isn't in the approved words. Brands come from the kit: list them with `.prism-kit/run.sh brands` (it marks the default) when presenting this; a piece picks one with `brand:`.

## Two ways to work

| | Full process | Quick mode |
|---|---|---|
| Start with | "Draft this into a case study" | "Quick one-pager from these notes" |
| Questions | A short interview (every question skippable) | None |
| Proof | You approve the words before anything is designed | After delivery: every number and claim is listed for you to check |
| Outputs | Any mix of formats from the same approved words | One file in one pass |
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

## Revising

- **Wording, facts, numbers, links:** change them once; they go into content.md and every output, keeping your layouts.
- **Layout** (move, split, restyle, a different icon, dark vs light): touches only that one output.
- **Every edit is proofread.** Typos, numbering and doubled words are fixed and reported; meaning (numbers, names, quotes, claims) never changes without asking. Each revision ends with a read-back: what changed, what was fixed for you, what was left out, what needs your call.

## Photos

- Upload them with the notes or at any point later. You'll be asked which one leads, which to use, and whether the people in them can be shown; clients or minors without confirmed consent are left out.
- Every layout crops a photo around its focal point (found automatically). If one misses, say "keep her face in frame".
- Reusable shots (team, office, product) belong in the brand's design system photo library, so any piece can use them.
- Send the largest file you have: anything that prints under 150 dpi moves to a smaller layout or stays out of print.

## Add a brand

Prism builds in any brand whose design system has a `tokens.json`. Say "add a brand" and upload the design system's files:
<!-- claude-only -->
or give its Claude Design System link.
<!-- /claude-only -->

1. A few questions: the design system, the brand name, which outputs it will be used for, and the defaults for its pieces (audience, contact line, email tool). Only the design system is needed.
2. Prism maps its core roles (colours, fonts, type, spacing, corners, logos) to the design system's own names, and writes the brand rules every writer and reviewer follows. The design system itself is never changed.
3. The swatch sheet shows every mapping, the type, the email colours in light and Outlook dark, and a sample of every layout in the brand. Ask for changes; it rebuilds each time.
<!-- claude-only -->
   It opens in design mode first as a lo-fi board; say "export" for the full styles. Start with `/prism-onboard` if you like.
<!-- /claude-only -->
4. Say **"done"** for the brand bundle. It goes to the Prism maintainer and ships with the next release; until then the brand works where it was made, as a draft (name it with `brand:` in a piece).

When a brand's design system changes, the same skill updates it and shows only what moved.

## Good to know

- Decks need the brand's Office fonts installed to present; the first deck comes with the font pack.
- HTML emails come with the HTML, an images zip, a plain-text version and light and dark previews; merge tags pass through untouched.
- "Editable" Illustrator, Canva or InDesign files aren't offered: changes are made here and rebuilt.
- Quick mode isn't proofed. Treat it as a draft until someone has checked its claims list.
<!-- claude-only -->
- Design mode is Claude only, and not in quick mode; say "design mode" after a quick run to open it.
- `/prism-tutorial` brings this rundown back at any time; add a topic (`/prism-tutorial photos`) for just that part.
<!-- /claude-only -->

## Try it

- "Draft this into a case study. I want a sheet, a brochure and three posts."
- "Quick one sheet from these notes, for supervisors, ending on a demo invite."
- "Make a trifold with the left + spread inside layout."
