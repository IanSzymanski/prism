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

## Every sheet

The build does these on its own for every Case Amplify sheet (profile `options.sheet`), so don't write them into a format file:

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
