# Sheet (PDF one-pager, white paper, brief, case study)

Build: `run.sh sheet formats/sheet.md out/<tag>.pdf` (tag: see Naming in SKILL.md). Letter size, printed at 90%. Also read components.md.

## Front matter

```yaml
---
title: How *Harbor Point* got its afternoons back   # accent word in *asterisks*
pagetitle: Harbor Point case study                  # plain text: PDF title and page footer
doctype: Case study                                 # top-right label: White paper, Research brief; leave out for a one-pager
eyebrow: Child & family services · Illustrative example
subtitle: One or two sentences.
author: <brand name>
date: September 2026
contact: example.com                                # closing line, left (default: the brand's contact line)
legal: Fictional organization, people and figures   # closing line, right (required when figures: illustrative)
hero: small                                         # optional: small | x-small title area for tight pages
---
```

## Body

- `##` headings carry the brand's section rule. `## Long heading {.stack}` puts the rule below; `{.no-rule}` removes it.
- `###` subheading, `####` small label.
- `---` is the brand's centered "full stop" between major parts. Use at most twice, usually once before the closing card.
- Footnotes (`[^id]`) become a numbered Notes list at the end. Each footnote id can be used once only; cite a second mention in text instead.
- Images: `![Caption](path.png)`; wrap in `::: shadow` for lift.
- `::: page-break` forces a new page. Use only when a section would otherwise split badly.

## Closing card

```markdown
::: cta-card
[<brand name>]{.eyebrow}

## Picture this with *your* programs

One sentence.

Start at [example.com](https://example.com).
:::
```

One per sheet, always last. No buttons.

Styles, in every brand: the full-width card (`::: cta-card`, the default), a centred smaller card (`::: {.cta-card .centered}`) and content only, with no ground (`::: {.cta-card .plain}`). Pick the one that fits how the piece ends (a quiet brief can close plain; a campaign piece with the full card), so a brand's pieces don't all end alike. A brand may add its own closing components (`components` in `run.sh brands --json`).

Sizes: `::: {.cta-card .small}` (smaller type and padding, still centred) or `::: {.cta-card .x-small}` (a slim left-aligned band). The default is for multi-page pieces.

## Fitting a one-pager

In this order, stopping as soon as it fits on one page:

1. `hero: small` and `{.cta-card .small}` (a hero image shrinks with `hero`).
2. `hero: x-small` and `{.cta-card .x-small}`.
3. With images: shorten a media row's text, drop a gallery to two images, turn a standalone figure into a media row.
4. Cut content: a supporting sentence, then a table or chart, then a whole section. Never shrink type any other way.

## Shape

- One-pager: `hero: small`, optional hero image, stats, 2–3 short sections (at most one media row), `{.cta-card .small}`. See "Fitting a one-pager".
- Images: see "Images" in components.md. Hero image first in the body; media rows inside the sections they illustrate.
- Case study (3–5 pages): At a glance (stats) → organization → challenge (features .three) → what they did (numbered list + tint callout) → results (table + chart) → what made it work (features) → disclaimer callout if illustrative → `---` → cta-card.
- Brief: at a glance → numbered findings (`###`) → table or chart → implications (checks) → caveats callout → cta-card → footnote sources.
