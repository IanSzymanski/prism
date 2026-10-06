# Outputs

This brand's choices for each Prism output. Sizes are Prism core's and are repeated only for reference.

## Sheet, one-pager, flyer, case study (Letter, PDF)

- Ground `surface`. Page one starts with the source band; masthead below it, logo top left, document type top right.
- Section headings carry the hue rule, cycling from hue-1. Code labels optional.
- One tint callout per page at most; the closing panel (CtaCard) at the end; one stop between chapters.
- Folio in mono `caption` at `faint` (the one allowed use of a sub-4.5:1 colour).
- Flyer: masthead, stats and the CtaCard only; no section rules.

## Brochure (trifold, letter landscape)

- Six panels on `surface`; the cover panel is the Masthead without lede, with the fan bleeding off its right edge.
- Inside spread: one section heading per panel; the hue follows the panel number.
- Back panel: the dark theme, with the closing panel's content and the light logo.

## Deck (16:9, PPTX)

- Content slides on `bg`; title, section and closing slides dark (gradient `dark-deep` to `dark-card` to `dark-high`, top left to bottom right).
- Title slide: logo, eyebrow with chip, title in `title` scaled to 54px, fan art on the right third.
- Full logo on title and closing slides; the glyph alone (24px, bottom right) on content slides.
- Each slide's title has a 3px hue rule; the hue follows the slide number.
- Steps layout uses the BandFlow hue cycle. Charts use the series tokens.
- Fonts: install from `fonts/`; fallback `safe-sans`.

## Blog header (1920x1080) and post

- Two palettes: **light** (`header-light-1` ground, `header-light-2` second ground, `fan-light.svg`) and **deep** (`header-deep-1`, `header-deep-2`, `fan-dark.svg`). Default light; deep for announcements.
- Title left, max 3 lines, in `title` scaled to 80px; eyebrow with chip above it; fan on the right third, never behind the title.
- Post body: tags as `.pt-tag`, charts as PNGs from the Chart rules.

## Social post (square, portrait, wide) and story

- Light posts on `bg`, dark posts on `bg` dark (the full dark theme). A set of three alternates light, dark, light.
- Eyebrow with chip top left, full logo bottom left (the glyph alone at 64px when the post is busy), "Sample content" note bottom right in `caption`. Profile avatar: `prism-glyph.png` on `bg`.
- Stats at most 3 per post; feature cards at most 2.
- Story: text inside the safe area (clear of the top 270px, bottom 384px, 88px sides); the fan may run under the interface, text may not.

## Carousel (1080x1350 panels)

- Full logo on the cover and last panels; the glyph alone (48px, top right) on the panels between.
- One thread along the bottom safe line across every panel (`Spectrum.thread(n, 1080)`), 12px tall; panel i emphasises `hueFor(i)`.
- Cover panel: masthead pattern. Last panel: the closing panel pattern in the dark theme.
- No thread through a face; panels with a full photo skip it.

## Email header (1200x420, short 1200x300, tall 1200x520)

- Ground `bg`, logo top left, eyebrow with chip, title in Bricolage Grotesque 700; fan on the right third in the default and tall sizes, none in short.

## HTML email (600px column)

- Page white, card white (Outlook-safe), text `fg` and `body`, links and buttons `accent` with `on-accent` text, bulletproof table buttons at `radius-sm`.
- Divider: the mini spectrum (48x4) centred, as an image or a four-cell table.
- Fonts: IBM Plex Sans and Bricolage Grotesque from Google Fonts, falling back to `safe-sans`; mono labels fall back to `safe-mono`.
- Logo: `prism-logo.png` at 168px wide in the header; `prism-glyph.png` at 32px in the footer beside the sign-off. Light only by default; any dark CSS is Prism's call.
