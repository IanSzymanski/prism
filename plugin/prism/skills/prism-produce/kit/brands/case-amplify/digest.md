# Case Amplify brand rules for content

If the `caseamplify-manifest` skill is available, it is the authority on terminology, positioning and approved claims. Load it. These rules are the short version and apply either way.

## Claims

- AI assists; people decide. Never imply Case Amplify makes eligibility, safety, legal, clinical, financial, placement or service decisions.
- Never call it an "AI caseworker", "autonomous case management", or a replacement for staff.
- Acknowledge that AI output can contain mistakes, omissions, unsupported details, misread context and overconfident language. Human review, correction and approval are part of the product, not a caveat.
- No unsupported metrics. A number needs a source in claims.md or it is flagged.
- Security and compliance language (HIPAA, SOC 2, data use, "data never leaves") only as approved in the manifest. Flag anything else.
- Integrations and automatic form completion depend on configuration. Do not promise them unconditionally.
- Illustrative or fictional pieces say so on every output: in the eyebrow or footer, on any quote attribution, and in captions.

## Voice

- Plain, specific, calm. Short sentences. Concrete over abstract.
- No fear-based replacement language, no hype words (revolutionary, game-changer, seamless, unlock, cutting-edge, robust).
- No em dashes. No "not X, but Y" constructions stacked for effect. No rule-of-three padding.
- Write for program directors, supervisors and caseworkers in human services. Respect the work; don't lecture.

## Visual rules the formatters enforce

- The wave motif never sits beside a person's photo, name or quote. It reads as a heart monitor.
- One dark card (`cta-card`, `.dark` post) per sheet. The dark background never carries monospace text.
- Grape emphasis (`*word*` in a heading) at most once per heading.
- Icons come from Phosphor Light only.

## Photos

- Never use a photo of an identifiable client, family member or minor unless the user confirms consent for this use. Staff and stock photos are fine once the user confirms rights.
- No wave rule directly beside or above a photo of a person: use `{.no-rule}` on an `##` that sits right on top of one, and no carousel wave through a face.
- `.shadow` is for one standout image per piece (usually the hero). `.fade` is the default treatment for hero and media-row photos; galleries and small figures stay crisp.
- Placeholder images are labelled as placeholders in their captions until replaced.
- Every image that carries meaning has a caption or sits next to text that describes it.

## Every printable (sheets, brochures, 5x7 cards)

The build does these on its own (profile `options.sheet`), so don't write them into a format file. Brochures and cards have no byline or footer line to drop; the rest applies to them too, except that variety is checked only on sheets and a brochure's inside spread:

- No byline (author and date) under the title, and no footer line (contact and legal) under the last page. An illustrative piece says so in its eyebrow and closing card instead.
- The closing card's QR code sits beside all of its copy.

Close every sheet with the full closing card, `::: cta-card` (not `.small` or `.x-small`), holding a rounded QR code, `{.qr .rounded url="https://caseamplify.com"}`, as an empty block after the copy: the larger card fills the last page. Step down to `.small`, then `.x-small` (with `{.qr .small .rounded ...}`), only when a page won't fit without it ("Fitting a one-pager" in the sheet card).
- A title or heading that would end on one word keeps its last two words together; a paragraph that would is reported (`[sheet] orphan`).
- Format variety is checked (`[sheet] variety`): use several formats per page (stats, cards, steps, a quote, a chart or table, columns, a callout). Cards come as 1x2, 1x3, 1x4 or 2x2, and any layout of cards counts as the same format, so don't fill a page with cards.

## One sheets

The approved Case Amplify one-sheet look (Oct 2026). Use it for a one-pager unless the piece asks for something else:

- Title area: `hero: x-small` with a photo beside the title and opening paragraph (`mast-image:`, `mast-image-alt:`; `mast-split: 1fr 1fr`). The photo fades toward the title over the wash; leave `mast-fade` on.
- Keep the audience phrase in the title on one line with non-breaking spaces: `*people\ you\ serve*`.
- Icons in grape (`.accent`).
- Process steps as `{.flow .plain}`: no grape rules above the steps. A "What they did" section (the steps an organization took, in order) is `::: steps` instead: a stacked numbered list of short steps, all on one page.
- Close with the full closing card and its QR code, as on every sheet; on a one-pager that won't fit, step down to `{.cta-card .small}`, then the slim `{.cta-card .x-small}` with `{.qr .small .rounded url="https://caseamplify.com"}`.
- Last, once everything fits on one page: `fill: page` to space the sections evenly down it.

## Decks

- The build puts the slide number on the left of the footer and the logo in the bottom-right corner of every slide but the title (on-dark on dark slides). Don't add `logo=` for it.
- Vary the grounds: one or two `.dark` slides and one `.purple` slide (the full purple ground) per deck, for a key stat, a quote or a turning point; never two in a row, never the title or closing slide. Keep line and donut charts on light slides.
- The same rules as printables otherwise: no orphan words in headings, and several layouts across the deck (stats, cards, steps, a chart, a quote), not cards on every slide.

## Posts and carousels

- One idea per post or panel: a heading and at most one short sentence (the build warns over 30 words, 35 on a story). The type is large; let it be.
- No wave line along the bottom, no page counter and no 01, 02 point numbers on panels (the build leaves all three out; don't write `burst`, counter notes or `[01]{.num}`); "Swipe →" on the cover stays.
- Stat figures are 3 characters at most (`41%`, `88%`, `9x`) so the big type never oversets; round the figure or move the unit into the label. The build reports longer ones (`[social] stats`).
- Charts work on panels: one ` ```chart ` under a short heading, at most six bars or rows; on `.dark` and `.purple` panels they take the on-dark colors with solid bars. Keep line and donut charts on light panels, as on slides.
- Vary them: no two panels in a row with the same layout, at least one `.dark` or `.purple` panel in a carousel of five or more, no three posts in a row on the same ground, no photo used twice and no three photo posts in a row. The build reports each (`[social] layout|color|photo|words`).

## Films

The brief carries these from the profile (`motion.film`); a format file never overrides them:

- No music, and no wave anywhere (backdrops, transitions, dividers).
- Gradient grounds are only the approved ones (glow, mist, night, vivid), written out as CSS in the brief; solid grounds are fine.
- Professional empathy with light playfulness: warm and calm, with small moments of play in the motion, never jokes.
- Lucide icons (write `.ph-` names as usual; the brief maps them).
- Fewer, larger words: 12 at most on screen per scene; large visuals that fill the frame. Free flowing: continuous motion from scene to scene.
- Walkthroughs: no title or end card (`.title`, `.closing` are refused); the app fills the whole frame (no window over a background), animates in at the start and out at the end; each step's `##` becomes a tethered annotation: a purple pill with one line of white text, joined to what it points at by a purple tether.

## Website illustrations

Abstract UI mockups for caseamplify.com feature pages, in the style of Ian's "Active Cases" artwork: a rounded tile on a deep violet gradient, a frosted glass panel with a Literata title, the rows that matter as lighter glass bands with outlined status pills, the rest as placeholder circles and bars, and a floating glass callout over the panel's edge. The profile (`illustration`) carries the look; the build enforces it. Write for it this way:

- One real Case Amplify feature per mockup, readable at a glance with its problem. When Ian supplies feature copy, illustrate that copy. Use the `caseamplify-manifest` skill's terms: connected case context, human review, reviewable and correctable output, caseworkers and program staff, participants.
- Each mockup gets its own layout and its own ground (violet, grape, dusk, haze), never the same as its neighbor on the page. "In the style of" means the glass, the simplified details and the kept important info, not the composition.
- Show the problem, then the answer. Where the feature involves AI output (`.ai`), end on a person reviewing or approving it (`.approve`): human review is product value.
- Color is only ever an outline: pills, citation circles, tags, buttons, dots, avatars. Emphasis is a `.key` row or `.mark` line (brighter glass), never a hue. `review` (amber) marks anything that still needs a person; `urgent` and `stable` only as status pills, as in the reference. No red or green traces.
- No waveform beside a person's name or photo, and nothing that idles after the animation.
- Fictional people and data only; one key fact per element (12 words at most). Never imply every form fills automatically, promise SMS delivery or replies, show an unconfirmed workflow capability as shipped, or present illustrative numbers as real results.
- About 5 seconds (a `size: full` overview about 6). Every block runs on the WordPress + Kadence site with its self-hosted GSAP 3.12.5 and ScrollTrigger: it plays once on the sitewide trigger line (`top 75%`, as `ca-rise`), joins the site boot through `CA.ready`, hides under `.js.pre`, and its script carries `data-cookieconsent="ignore"`. For production, the shared CSS can move into one `ca-mock.css` and the scripts into an enqueued file on the Cookiebot allowlist; the blocks work as they are until then.

## Website pages

Whole pages for caseamplify.com (WordPress multisite, Kadence theme and Kadence Blocks Pro, the caseamplify-child-new child theme). The site kit (`web/blocks.js`, profile `web`) writes each block as the markup its site pattern saves, so pasted pages stay editable in the editor; the child theme owns every style and script, so the markup carries no CSS. The live /vocational-rehabilitation/ page is the model: rebuilt from its web.md it matches the saved page block for block.

- `template: inner` on every inner page (title hidden, full width, unboxed, no vertical padding).
- The section rule belongs to the heading row (the site's header/divider patterns) and runs toward the media row's text, as on the live pages; the build alternates the sides. The hero has its own rule under the title, the band one under its heading, and every page ends on the synced full-stop rule. Never write rules or spacers.
- Motion: `rise=` on a heading or block takes `rise`, `settle`, `lift`, `soft` or `sweep` (wave-system.md §4.4). The defaults fit almost everywhere (headings and media rows `rise`; centered headings, cards, stacks and the FAQ `lift`); the first media row on the live pages uses `settle`. `sweep` at most once per screen: never in two neighboring sections.
- One CTA card per page (`::: cta-card`, wave-system.md §4.5): its gradients are found by id. Its heading's `*word*` is set in italics.
- One band per page, for what changes overall, with up to five glass cards.
- Icons: Phosphor Light names (`icon=calendar-check-fill` on the primary demo button, as on the site). Only icons already used on the site are known to work in its icon set; the build warns on any other, so check it in the editor's icon picker first.
- Lists are drawn as "•" lines, as on the live site, until `ca-base.css` has a `ca-` list class.
- Unfilled image slots show the "Trust at every level" photo (media 3901) until a photo is chosen. Photos of real staff or clients need the usual consent.
- Delivery: the blocks file is pasted into a new draft's Code editor; Ian and Rob approve and publish. Never use the "Website" WordPress connector (that is intellitect.com). The "Case Amplify Website" connector and the ca-prism-bridge plugin that will create drafts from page.json aren't ready yet: deliver the files. On the multisite only super admins keep `core/html` blocks whole (the CTA card and rules), so whoever saves the page must be one, or the SVG is stripped.
- `wave-system.md` (the site's motion and CSS spec, in the claude.ai project) governs motion, the rules and the CTA card. A change to any of them names the sections it amends, and Ian is asked before the spec is updated.
