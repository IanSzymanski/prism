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

## One sheets

The approved Case Amplify one-sheet look (Oct 2026). Use it for a one-pager unless the piece asks for something else:

- Title area: `hero: x-small` with a photo beside the title and opening paragraph (`mast-image:`, `mast-image-alt:`; `mast-split: 1fr 1fr`). The photo fades toward the title over the wash; leave `mast-fade` on.
- Keep the audience phrase in the title on one line with non-breaking spaces: `*people\ you\ serve*`.
- Icons in grape (`.accent`).
- Process steps as `{.flow .plain}`: no grape rules above the steps.
- Close with a slim left-aligned card, `{.cta-card .x-small}`, holding a small rounded QR code, `{.qr .small .rounded url="https://caseamplify.com"}`.
- No footer contact line (`colophon: off`): the closing card already carries the address.
- Last, once everything fits on one page: `fill: page` to space the sections evenly down it.
