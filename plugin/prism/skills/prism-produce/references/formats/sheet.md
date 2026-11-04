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
layout: stat-first                                  # optional: a page layout (see "Layouts"); none is standard
---
```

### Sheet modifiers (optional, sheets only)

Each is off unless the front matter asks for it. Brochures and 5x7 cards ignore them.

```yaml
mast-image: images/team.jpg          # a photo beside the title and opening paragraph: images/…, brand:<id>, prism:placeholder
mast-image-alt: Two staff members reviewing a case file
mast-split: 1fr 1fr                  # optional: text column, image column (default 1fr 1fr)
mast-focus: 50% 30%                  # optional: overrides images.md / .focus.json
mast-fade: false                     # optional: no fade toward the title (on by default when the brand fades photos)
fill: page                           # optional, one-pagers only: sections spaced evenly to fill the page
colophon: off                        # optional: no closing line (contact and legal) at the foot
```

- `mast-image` gives the title area more room above the logo and less below it. It replaces a `hero-image`: use one or the other. It suits `hero: x-small` and `hero: small`.
- `fill: page` only adds space between the `##` sections and above the closing card; it never shrinks anything. It does nothing (with a warning) when the sheet runs past one page.
- `colophon: off` also drops the `legal` line, so an illustrative piece must say so elsewhere (eyebrow or closing card).

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

A title-area photo (`mast-image`) takes less height than a hero image or a media row. `fill: page` is the last step, once the content fits: it spreads the sections down the page.

## Layouts

A sheet's `layout:` picks what leads its first page: the title band, a photo, a figure or a rail. A layout is an arrangement of the sheet's parts, not a look: a colour, size or closing style is never a layout. `run.sh layouts --brand <brand>` lists the layouts this brand has, in the order to try them: its own first (brand layouts), then the Prism default layouts it keeps, `standard` last. No `layout:` means `standard`.

| Prism default layout | Front matter and markup it needs | Pick it when |
|---|---|---|
| `standard` | nothing | Nothing else clearly leads the piece |
| `photo-led` | `image: images/<file>` (or `brand:<id>`; `image-focus: x% y%` optional): the cover photo, full width under the logo bar, with the title over it | A landscape photo that prints 6.5 in wide or more (images.md: hero) and carries the story. Never a client or minor without confirmed consent |
| `stat-first` | `stat: 41%` and `stat-label: less time on case notes, in four months`: one very large figure and what it measures, above the title | One number carries the piece. The figure and label come from content.md, written the same way (the number check reads them) |
| `sidebar` | a `::: rail` block (stats, a short quote, the contact) anywhere in the body: the build puts it in a tinted rail beside the story | Three or more figures, or figures and a quote, that should stay in view beside the story |

```markdown
---
title: How *Harbor Point* got its afternoons back
layout: stat-first
stat: 41%
stat-label: less time on case notes, in four months
hero: small
---
```

```markdown
::: rail
### At a glance

::: stats
- **41%** less time on case notes
- **94%** of drafts approved
:::

> Our afternoons are ours again.
>
> [Dana Ruiz, Program lead]{.cite}
:::
```

**Brand layouts.** A brand can have layouts of its own, as many as it needs (the listing names the brand under `from`). Each says what it is for (`use`), when to pick it (`when`) and what it needs, like the defaults, and builds on one of them (`base`): a brand layout on `photo-led` needs the cover photo too. It may set front matter defaults (a smaller title area, say) and its own styles; anything the format file's front matter sets wins over its defaults. A brand layout with a default's id replaces that default for the brand, and a brand can switch a default off, so use only what the listing shows.

- **Picking:** read content.md and images.md, then go down the brand's list (its own layouts before the Prism defaults) and take the first whose "when" fits the content and whose needs the piece has; else `standard`. Never invent a layout. Say which one in your reply, with the reason in a few words.
- **One-pagers:** every layout fits on one page with "Fitting a one-pager". `hero: small` and `x-small` also shrink the cover photo and the lead figure. Photo-led takes the most room: cut harder.
- In a photo-led sheet the hero photo is the cover: don't repeat it as a `::: hero-image`, and leave out `mast-image` (it goes with `standard`). In a stat-first sheet the lead figure can stay in the stats row below only if the row has other figures too.
- The build stops on a layout this brand doesn't have, or one missing what it needs.

## Shape

- One-pager: `hero: small`, optional hero image or title-area photo, stats, 2–3 short sections (at most one media row), `{.cta-card .small}`. See "Fitting a one-pager".
- Images: see "Images" in components.md. Hero image first in the body; media rows inside the sections they illustrate.
- Case study (3–5 pages): At a glance (stats) → organization → challenge (features .three) → what they did (numbered list + tint callout) → results (table + chart) → what made it work (features) → disclaimer callout if illustrative → `---` → cta-card.
- Brief: at a glance → numbered findings (`###`) → table or chart → implications (checks) → caveats callout → cta-card → footnote sources.
