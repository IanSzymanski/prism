# Case Amplify

Case Amplify is AI-assisted case management for human services agencies. The brand is plain, specific and calm: paper-white pages, Literata headings, one grape word, and a single wave line that reads as signal, never as a pulse.

This system's visuals are built from the Case Amplify Content Studio kit (0.13.1, now Prism), which produces every designed Case Amplify file: sheets, brochures, decks, blog posts, social posts, carousels and HTML emails. Values are the kit's, exactly; print sizes are pt in the kit and px here.

## Product and message

The **Case Amplify Product and Marketing Manifest** (version 0.12, October 26, 2026) is part of this system: the *Manifest* sections that follow the brand book hold it in full. It is the source of truth for what Case Amplify is, what it does, how it is described, and what may be claimed. Where this brand book and the manifest overlap, the manifest governs the words and this book governs the visuals.

**Positioning statement** (approved; use as written in About and boilerplate sections, press releases, proposals, RFP overviews and partner materials):

> Case Amplify is an AI-powered case management system that turns everyday conversations into actionable case information, making it easier to support clients and foster meaningful outcomes.

**One-liner:** Smarter case management. Less paperwork. More human impact. Short form, where space is tight (social graphics, ad units, email headers, slide footers): Smarter case management. More human impact. Never reworded.

**Core idea.** Case Amplify helps caseworkers and program teams spend less time reconstructing context, moving information between systems and producing repetitive documentation, so they can keep case information organized, see what needs attention and act with better context. The assistant is **CARA**; dashboards built by describing them are **Case IQ**.

## Content fundamentals

**Working agreement** (Manifest · About). Draft first and write with confidence, in present tense. Where a piece needs a number, customer, quote or detail nobody has supplied, put a bracketed placeholder such as [X hours saved per week] and keep writing; never invent one. Leave AI caveats and compliance fine print out unless the piece is about them. Ian and Rob review every piece before it ships; direction from them for a piece wins.

**Claims** (Manifest · 13–15 and 7). Human review is part of the product, not a caveat: staff review, correct and approve AI-assisted information. The hard lines never move: Case Amplify does not replace caseworkers; AI output is not described as always accurate or error-free; AI does not make final consequential decisions or update the record without review; nothing guarantees compliance or is "HIPAA certified"; no planned capability is presented as available (Case IQ exports, detailed dashboard permissions and sharing); Case IQ visualizes data already in Case Amplify and never generates or predicts it; and no invented numbers, customers, quotes, testimonials or outcomes. HIPAA, SOC 2 Type II, audit, report and BAA wording is used exactly as approved in Manifest · 7. Illustrative pieces say so on every output: eyebrow or footer, quote attributions, captions.

**Voice** (Manifest · 14). Respectful toward caseworkers and clients; practical and direct; specific without becoming inaccessible; confident but measured; clear about human oversight; grounded in real work. Lead with recognizable casework problems, not abstract AI capability. Short sentences, concrete over abstract.

- Do: "Notes close the same day." "Staff approve every draft before it is saved."
- Don't: hype words (revolutionary, game-changer, seamless, unlock, cutting-edge, robust), fear-based replacement language, em dashes, stacked "not X, but Y", rule-of-three padding.

## Visual foundations

**Ground.** Every page, slide and post sits on `paper` (#FFFFF8), never pure white. Colours are solid, never transparent, because PDF viewers blend transparency differently. Title areas sit on a radial wash from `wash` to `paper`.

**Colour.** `ink` for headings, `body` for text, `muted` for captions, `faint` for folios and axis ticks only. `grape` is the brand hue, used in small, exact doses: the one accent word in a heading, stat figures, list markers, check icons, chart highlights, email buttons. Hairlines in `hair-soft`; the wave in `hair`. Charts use `series-1` to `series-5` in order, with `grape-hot` over `grape` for highlighted bars. The series colours belong to charts and graphs only: data marks and their legend keys. Never use them for text, accent words, backgrounds, borders, icons, buttons, washes or any other part of a layout; outside a chart, reach for the named tokens above.

**Dark.** The dark theme is the dark card, not a dark mode: `dark-card` under the `cta-card` background image, used once per sheet (the closing card), once per post set, and for the deck's dark slides (gradient `dark-deep` → `dark-card` → `dark-high`). On dark: eyebrows in `lilac` and sans, never mono.

**Type.** Three families. Literata (serif, static instances at optical size 32) for display, headings, quotes and figures. Inter for running text, with stylistic sets ss01 and cv11 on. IBM Plex Mono for eyebrows, labels, captions and citations, tracked out. One `grape` word per heading at most, set as `*word*` in the Markdown.

**The wave.** One flat line with one damped burst (see the Wave component). It opens a section beside its heading, closes a chapter as a centred stop, divides an email, and threads a carousel. It never sits beside or above a person's photo, name or quote, where it reads as a heart monitor, and never directly above any photo.

**Images.** `.fade` (a smoothstep ramp to the ground, toward the text) is the default for hero and media-row photos. `shadow-lift` marks one standout image per piece. Galleries and small figures stay crisp. Corners `radius-xl` for the hero, `radius-lg` for figures, `radius-md` for gallery images. No identifiable client, family member or minor without confirmed consent.

**Spacing.** `space` between paragraphs, `space-section` above a section heading, `space-gap` between a heading and its rule; 0.75in (`page-x`) side margins in print.

## Iconography

Phosphor Light only, at its own 1.4 stroke on a 24px grid, in `grape` on cards and callouts or `paper` on dark. In PDFs icons are inline vector paths, never a font. Phosphor is an open icon library and is not copied into this system; use its Light weight from the Phosphor package.

## Logos

`assets/Logos/ca-logo.png` on paper and light grounds, `ca-logo-light.png` on dark. 22pt tall on a sheet masthead, 168px wide in email. Never recoloured, stretched or redrawn.

## Not in this system

Office- and email-client-safe alternates (Arial and Georgia stacks, the Outlook-safe email palette) are kept by Content Studio's brand profile, which derives them from these tokens and records their review.
