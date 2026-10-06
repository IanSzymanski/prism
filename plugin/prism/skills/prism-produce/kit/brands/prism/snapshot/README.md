# Prism

Prism is a content studio that turns raw material (notes, transcripts, documents, photos) into complete documents of any kind. One approved draft becomes a one-pager, a case study, a brochure, a deck, a blog post, social posts, a carousel and an email, all finished and on brand. This design system is Prism's own brand, and the second brand Prism is tested against.

The look follows the Prism Backlog: cool grey grounds, Bricolage Grotesque headings, IBM Plex text, and a flat four-band spectrum (red, amber, green, blue), the four bands a prism splits one source into. It is simple on purpose, but every Prism output can be built from it.

Sample copy describes Prism's own workflow; every figure, quote and person in it is sample data.

## Why it differs from Case Amplify

These choices are deliberate test levers, so a build shows whether Prism reads the brand or hardcodes Case Amplify:

- **Icons**: Phosphor **Regular**, not Light.
- **Dark**: a full dark theme (every component has one); no single dark object.
- **Closing panel**: a flat panel on `soft` with the source band along its top edge, not a dark card with an image.
- **No washes, no fades**: grounds are flat colour; photos are never faded.
- **Mono on dark** is allowed (Case Amplify forbids it).
- **Two primary buttons**: ink (`fg`) and `accent`.
- **Aliased colours**: `series-1` to `series-5` are `{token}` references that must be resolved per theme.
- **A numbered dynamic rule**: sections, flow steps, slides and panels cycle hues with `Spectrum.hueFor(n)`.
- **Print ground** is pure `surface` (#ffffff), not an off-white paper.

## Content fundamentals

**What Prism does.** Prism takes whatever content someone has and turns it into the documents they need: it drafts one piece from the source, the person proofs and approves it, and Prism produces every format they named, laid out for its channel and styled from the brand's design system. Write about that work: sources going in, one draft, an approval, finished files coming out.

**Voice.** Plain, practical, confident. Say what goes in, what comes out and what the person does. Sentences under 20 words; one idea each. Talk to the person making the content ("your notes", "your deck"), not about "users".

- Do: "Paste your notes. Approve the draft. Get the deck, the sheet and the posts." "One draft becomes nine formats."
- Don't: hype (revolutionary, seamless, magic, unlock, game-changer), em dashes, stacked "not X but Y", rule-of-three padding.

**Claims.** Prism drafts and builds; people approve. Never "fully automatic", "no review needed" or "replaces your designer". Name only formats Prism builds (sheet, one-pager, flyer, case study, brochure, deck, blog post and header, social post, story, carousel, email header, HTML email). Every number needs a source in content.md; sample pieces say "Sample content" in the eyebrow, footer or caption, and "Fictional data." under charts. Fictional people say so in their attribution.

**Words.** "Draft", "proof", "approve", "produce", "format", "document". Avoid "generate" for the finished files (Prism builds them from an approved draft), and "template" for the brand (it is a design system).

## Visual foundations

**Roles.** Prism maps these roles; use the token named, never a raw value.

| Role | Token | Dark theme |
|---|---|---|
| Screen ground | `bg` | `bg` dark |
| Print page, cards | `surface` | `surface` dark |
| Headings | `fg` | `fg` dark |
| Running text | `body` | `body` dark |
| Captions, labels | `muted` | `muted` dark |
| Hairlines | `line` | `line` dark |
| Band, chips | `soft` | `soft` dark |
| Brand accent | `accent` (+ `on-accent`) | `accent` dark |
| Tint | `accent-tint`, `accent-line` | dark values |
| Dark slides and the dark theme's fixed values | `dark-deep`, `dark-card`, `dark-high`, `dark-fg`, `dark-muted`, `dark-accent` | same (always dark) |
| Motif | `hue-1` to `hue-4`, text in `hue-N-text` | dark values |
| Charts | `series-1` to `series-5`, `grid` | via aliases |

**Colour.** Neutral first. `accent` is the one brand colour in text: the single accent word in a title (`*word*`), stat figures, links, icons, check marks, highlighted chart bars. The four hues are fills and rules only; text in a hue uses its `hue-N-text`. Colours are solid; no transparency in print.

**Type.** Bricolage Grotesque (700 for display, 500 for quotes) for titles, headings, stats and quotes. IBM Plex Sans for running text. IBM Plex Mono 500 for eyebrows, labels, codes, captions and citations, uppercase where the style says so. Fallbacks: `safe-sans` (Segoe UI, Arial) and `safe-mono` (Consolas) for Office and email clients.

**The spectrum.** Four flat bands, always in order 1 to 4, from `assets/Spectrum/spectrum-core.js`. Kinds: the source band (6px, edge to edge, top of page one and of the closing panel), chip (64x6, before a title's eyebrow), stop (96x6, between chapters), mini (48x4, email divider), thread (across carousel panels), fan (the bands leaving the glyph; header and title-slide art, right third only) and the section rule (one hue, 3px, by section number). Never over a photo or behind text. Full rules: the Spectrum component.

**Masthead and closing panel.** Page one starts with the **source band**: the four hues edge to edge, 6px, across the top of the page. The closing panel (CtaCard) carries the same band along its top edge. These two are Prism's signature; there is no wash and no dark card.

**Layout.** Flat: borders, not shadows. Cards and callouts have a full 1px `line` border at `radius-md`; never a coloured left bar. One `shadow-lift` image per piece at most. `space` between paragraphs, `space-lg` between blocks, `space-section` above a section heading, 0.75in (`page-x`) print margins.

**Images.** Hero images at `radius-lg`; no fade (the brand is flat; Prism's `.fade` should be ignored or tested as off). No spectrum over or beside a face.

## Iconography

Phosphor **Regular** (open source, MIT), 22px on cards, 20px in callouts, 18px in checklists, in `accent`, `on-accent` on buttons, `dark-fg` on dark. Inline SVG paths in every output; never an icon font in PDFs. Phosphor is not copied into this system; use the Regular weight of `@phosphor-icons/core`.

## Logos

The Prism logo: the wordmark "prism" (Bricolage Grotesque Bold, outlined) and the glyph, an inverted equilateral triangle cut at its edge midpoints: three corners in amber (top left), blue (top right) and red (bottom) around an open centre, one source split three ways. The glyph also works on its own. Files in `assets/Logos/`:

| File | Use |
|---|---|
| `prism-logo.svg` / `.png` | Full colour, on light grounds (`bg`, `surface`, `accent-tint`) |
| `prism-logo-light.svg` / `.png` | Full colour reversed (white wordmark), on dark grounds (dark theme, dark card, dark slides) |
| `prism-logo-mono.svg` | One colour, near-black: print in one ink, fax, embossing, small sizes on light |
| `prism-logo-mono-light.svg` | One colour, white: over photos and coloured fills |
| `prism-glyph.svg` / `.png` | The glyph alone in colour, on light or dark: avatars, favicons, slide and panel corners, email footers |
| `prism-glyph-mono.svg`, `prism-glyph-mono-light.svg` | The glyph in one colour, black or white |

- **Full logo first**: mastheads, title and closing slides, blog headers, email headers, carousel cover and last panels.
- **Glyph alone** where the name is already present or space is tight: content slides, carousel middle panels, social avatars, favicons, email footers. Minimum 16px tall; under 24px prefer the mono glyph on light grounds, where the colour glyph's amber is faint (2:1 on `bg`).
- **Sizes**: 30px tall on a sheet masthead (22pt), 40px on title slides, 168px wide in email headers.
- **Clear space**: half the glyph's height on every side.
- Never recoloured, stretched, outlined or redrawn; never the colour glyph on `accent` or a hue fill (use mono-light there).
- The glyph's hues are this system's dark-theme `hue-1` (red), `hue-2` (amber) and `hue-4` (blue). The spectrum motif adds `hue-3` (green) as a fourth band; the logo has three.

## Test images

`assets/Templates/`: flat sample scenes in the brand's neutrals, each labelled "Sample image", for building and testing outputs before real photos exist: landscape 3:2 (light and dark), portrait with a person 4:5 (for placement rules near people), square 1:1, wide 2:1 and a product screen 16:10. Never ship them as real photography.

## Fonts

Static TTFs in `fonts/` (Bricolage Grotesque 500 and 700 at optical size 48; IBM Plex Sans 400, 500, 600; IBM Plex Mono 500), all SIL Open Font License (`licenses/`). Decks need them installed; build Prism's font pack from these files.

## Not in this system

The Outlook-safe email palette and any Office font renames are Prism's to derive from these tokens, as for Case Amplify. Format sizes (page, slide, post and email dimensions) belong to Prism core; the Outputs section lists only this brand's choices per format.
