# Prism

**Prism turns raw material into finished, on-brand marketing files: one-pagers, brochures, cards, decks, social posts, emails, web pages and animated films, all from one set of approved words.** It runs inside Claude as a plugin.

Give it notes, a call transcript, a document or a few photos. Prism asks only what it doesn't know, drafts the words, has them reviewed and stops for your approval. Then it lays the approved words out in every format you ask for, in your brand, checks every number against what you approved, and hands back finished files. Change a fact once and every file updates. Move a block on the design canvas and only that file changes.

## The problem it solves

Marketing content is written once and then rebuilt by hand for every channel, and that is where things go wrong:

- **Facts drift.** The deck says 41%, the post says 40%, the email rounds to "nearly half". Every copy is a chance to change a number nobody checked.
- **Brands slip.** Files made in five tools by five people look like five companies. Consistency depends on who has the template and the time.
- **Review comes too late.** Words are approved on finished designs, so a wording fix means redoing every layout.
- **AI drafts make things up.** A helpful number or quote that was never in the source ends up in print.
- **Brand changes wait on someone.** A new brand, a new layout or a new set of outputs means waiting for a designer or a tool update.

Prism's answer:

- **One approved source.** The words live in one file, `content.md`, approved before anything is designed. Every output is laid out from it, and the build refuses any number that isn't in it.
- **A fixed build kit, not freehand design.** Every file is built by the same kit in the brand's own fonts, colors, logos and components, so a sheet, a deck and a post from the same piece look like they belong together.
- **Proof before design.** The words are reviewed and approved first, in a shared doc, with every claim listed beside its source.
- **Brands owned by their teams.** A brand lives in its own Claude Design System. Its editors add and change it, including its layouts and output packages, and everyone in the organization who can open it gets the change in their next session, with no plugin update.

## How a piece is made

1. **Draft.** Attach your material and say what you need: "draft this into a case study, I want a sheet, a deck and three posts." An interview asks only what's missing (audience, length, outputs, photos); skip anything and answer later. A writer drafts the words with a claims ledger, and a reviewer flags claims and brand issues without rewriting.
2. **Proof.** The words open in a Claude Doc, with the claims on their own tab and every reviewer flag as a comment. Edit, comment or reply in chat, and say "approve" when the words are right. Nothing is designed before this.
3. **Produce.** Each output is laid out by its own formatter and opens in **design mode**: a plain wireframe on a Claude Design canvas where you drag blocks and slides into order, delete what should go and retype text. Say "done" and Prism builds the real files in the brand's styles, checks every number, previews and verifies them, and sends them back.
4. **Revise.** Reply with a change or upload an edited file. Wording, facts and numbers go into the approved words and flow into every output, keeping your layouts. Layout changes touch only the one output. Every edit is checked before it is rebuilt.

Also:

- **Quick mode.** "Quick one-pager from these notes" makes one output in one pass, with no questions and no proof stop, and lists every claim to check afterwards.
- **Co-op mode.** Invite teammates to the proof doc and the design canvas. They edit by hand or ask `@claude` in comments, your Prism does the work, and only you approve and export.
- **Packages.** A set bundle of outputs from one piece, such as a case study package (a sheet, a deck, posts and an email), delivered as one zip. Teams define their own.

## What it makes

| Output | What you get |
|---|---|
| One sheet | A Letter PDF: one-pagers, briefs, case studies and white papers, with photos, charts, figures, steps and QR codes. A white print copy on request. |
| Brochure | A Letter trifold PDF, two sides of three panels. |
| 5x7 card | A 5 × 7 in PDF: postcards, invitations and mailers, front and back, portrait or landscape. |
| Deck | An editable 16:9 PowerPoint with native charts, and the brand's fonts as a pack. |
| Social posts and stories | PNGs for square, portrait and wide posts and 1080 × 1920 stories, with their captions. |
| Carousel | PNG panels and a caption. |
| Email header | Header images at 2x, light, dark and photo-split, with subject lines. |
| HTML email | Newsletters, announcements and letters that hold up in Outlook and dark mode, with images, plain text and previews. |
| Blog post | A header image, chart images and the post text for WordPress. |
| Website page | A whole page for the brand's WordPress site, as block markup to paste into a draft, with its settings and photos. |
| Website illustration | An animated UI mockup of one feature for a website feature page. |
| Animated film | Short films made with Claude Motion from a direction script, checked line by line; a walkthrough film rebuilds the product from your screenshots. |

Logos, QR codes and device mockups (a screenshot in a phone, tablet or laptop) can go on any block in any format. Every photo is cropped around its focal point and stripped of location and camera details.

## Brands and layouts

A brand is a **Claude Design System** with a small Prism folder inside it: how the design system's colors, fonts, type, spacing and logos map onto Prism, the brand's writing rules, and its own layouts and packages. Sharing and editing rights come from the design system itself: everyone who can open it can make pieces in the brand, and only its editors and owners can change it.

- **Add a brand.** Say "add a brand" (or run `/prism-onboard`) with a design system's link. Prism maps it without changing the design system, shows the result on a swatch sheet, and on "done" publishes the brand into the design system. Everyone who can open it has the brand in their next session.
- **Page layouts.** Every brand can use Prism's default layouts: a sheet led by its title, a full-width photo, one big figure, or a side rail of figures and a quote. A brand can also have layouts of its own. Prism picks the one that fits the content, or you name one ("lead with the photo").
- **Save an arrangement as a layout.** An editor can arrange a sheet in design mode and say "save this as a layout". The order of its blocks becomes a reusable layout, and later pieces in it follow the same order.
- **Updates.** When a design system changes, the next session reads the new version in, and the onboarding skill's update shows what moved for the brand and publishes it.

Two brands come bundled with the plugin: Case Amplify (the default) and Prism's own.

## Get started

1. Download `prism-<version>.zip` from [Releases](https://github.com/IanSzymanski/prism/releases) and add it as a plugin in the Claude app.
2. Run **`/prism-tutorial`**. It makes a fictional sample case study from start to finish (the interview, the draft, the proof, design mode, the export), then turns the same words into a deck, a carousel or a film, explaining each stage and pausing so you can try it. `/prism-tutorial rundown` gives a short overview instead.
3. Try it on your own material:
   - "Draft this into a case study. I want a sheet, a brochure and three posts."
   - "Draft this into a case study package, but skip the deck."
   - "Quick one sheet from these notes, for supervisors, ending on a demo invite."
   - "Make a 5x7 card inviting partners to the open house: photo on the front, a mailer back."
   - "Also make a 15-second animated film of the results for Instagram stories."
   - "Turn this into a landing page for the site."

Start with `/prism-interview` to answer every question up front.

## What you need

- Claude with plugins. Builds run in Claude's own environment; the kit installs what each output needs the first time it is built.
- **Claude Docs** for the proof doc (without it you get the words and claims as files).
- **Claude Design** for design mode and for brands (a Claude Design System per brand).
- **Claude Motion** for animated films (Team and Enterprise plans).

## This repository

| Path | What |
|---|---|
| `plugin/prism/` | The plugin: its skills, agents, commands and the build kit. `plugin/prism/README.md` is the guide that ships with it. |
| `fixtures/`, `tests/` | One sample of every output, used for regression builds, and the test suites. |
| `guide/` | The user guide, built as a sheet. |
| `tools/` | Release and maintenance tools (`build.py` stamps a version and zips the plugin). |

To build, test or release Prism, see [DEVELOPING.md](DEVELOPING.md). `HANDOFF.md` holds the working notes and design decisions.
