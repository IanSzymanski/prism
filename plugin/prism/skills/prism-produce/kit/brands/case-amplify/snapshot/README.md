# Case Amplify

Case Amplify is AI-assisted case management for human services agencies. The brand is plain, specific and calm: paper-white pages, Literata headings, one grape word, and a single wave line that reads as signal, never as a pulse.

This system is built from the Case Amplify Content Studio kit (0.13.1), which produces every designed Case Amplify file: sheets, brochures, decks, blog posts, social posts, carousels and HTML emails. Values are the kit's, exactly; print sizes are pt in the kit and px here.

## Content fundamentals

**Claims.** AI assists; people decide. Never imply Case Amplify makes eligibility, safety, legal, clinical, financial, placement or service decisions. Never "AI caseworker", "autonomous case management", or a replacement for staff. Human review, correction and approval are part of the product, not a caveat. A number needs a source. Security and compliance language (HIPAA, SOC 2, data use) only as approved in the Case Amplify manifest. Integrations depend on configuration; never promise them unconditionally. Illustrative pieces say so on every output: eyebrow or footer, quote attributions, captions.

**Voice.** Plain, specific, calm. Short sentences; concrete over abstract. Written for program directors, supervisors and caseworkers in human services: respect the work, don't lecture.

- Do: "Notes close the same day." "Staff approve every draft before it is saved."
- Don't: hype words (revolutionary, game-changer, seamless, unlock, cutting-edge, robust), fear-based replacement language, em dashes, stacked "not X, but Y", rule-of-three padding.

## Visual foundations

**Ground.** Every page, slide and post sits on `paper` (#FFFFF8), never pure white. Colours are solid, never transparent, because PDF viewers blend transparency differently. Title areas sit on a radial wash from `wash` to `paper`.

**Colour.** `ink` for headings, `body` for text, `muted` for captions, `faint` for folios and axis ticks only. `grape` is the brand hue, used in small, exact doses: the one accent word in a heading, stat figures, list markers, check icons, chart highlights, email buttons. Hairlines in `hair-soft`; the wave in `hair`. Charts use `series-1` to `series-5` in order, with `grape-hot` over `grape` for highlighted bars.

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
