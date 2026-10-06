# Brochure (Letter trifold PDF, two sides, three panels each)

Build: `run.sh sheet formats/brochure.md out/<tag>.pdf` (tag: see Naming in SKILL.md). The `layout: brochure` line switches the sheet builder to landscape Letter at true size. Output is two pages: page 1 the outside, page 2 the inside. Print double-sided, flip on the short edge. Also read components.md.

## Front matter

```yaml
---
pagetitle: Case Amplify brochure     # plain text: PDF title
layout: brochure
---
```

No title, masthead or footer: the cover panel carries them.

## Panels

Panels fill six slots, in this order. Every three slots become one printed side.

| Slot | Block | Where it ends up when folded |
|---|---|---|
| 1 | `:::: {.panel .flap}` | Page 1 left: the inside flap (the panel that folds in) |
| 2 | `:::: {.panel .back .dark}` | Page 1 center: the back cover. The piece's one dark object |
| 3 | `:::: {.panel .cover}` | Page 1 right: the front cover |
| 4–6 | one of the inside layouts below | Page 2, left to right |

Inside layouts, pick one per brochure and offer the others to the user:

| Layout | Blocks | Use when |
|---|---|---|
| Three panels | `:::: panel` × 3 | Three separate topics |
| Left + spread | `:::: panel`, then `:::: {.panel .wide}` | One topic on the left, one design across center and right |
| Full spread (default) | `:::: {.panel .full}` | The whole inside reads as one piece |

Use `::::` for panels so components inside keep `:::`. Each panel is about 3.6 in wide and cannot spill into the next one: content that doesn't fit is cut off, so check the preview.

### Wave headers

Every `##` gets a wave rule under it, with its one burst at the start (on the dark panel it turns lavender). A rule never has more than one burst. The cover's `#` title has no rule. Keep a person's photo out from directly under a rule: put a paragraph between them.

### Cover

```markdown
:::: {.panel .cover}
::: hero-image
![](images/cover.jpg){.fade}
:::

::: cover-body
![](prism:logo){.logo}

[Eyebrow]{.eyebrow}

# Title with an *accent* word

[One or two sentences.]{.lede}
:::
::::
```

Cover photo: portrait or square works best (it crops to 3.7 × 4.35 in). No hero? Drop the hero-image block; the cover-body then starts at the top.

### Back (dark)

Eyebrow, `##` heading, one sentence, contact list in `::: contact` (`- **Web** caseamplify.com`), then a `::: push` block holding `![](prism:logo-on-dark){.logo}` and `[Legal or fictional label]{.small}`. An optional photo at the top. No mono text here; captions switch to Inter automatically.

### Inside left

Start with `[01 · Short label]{.num}`, then `##`. Features stack in one column in a panel. `::: push` pushes a block (callout, closing line) to the panel bottom.

### Inside center and right (`.wide`)

```markdown
:::: {.panel .wide}
::: hero-image
![](images/spread.jpg){.fade}
:::

[02 · Label]{.num}

## One heading for the spread, with an *accent* word

::: col
Center panel content.
:::

::: col
Right panel content.
:::
::::
```

The photo bleeds across both panels (1.8 in tall), and the heading's wave rule runs across the fold, so the spread reads as one piece when fully opened. Keep the heading text on the center panel (it wraps before the fold), and the photo's subject to one side of the fold; a landscape photo about 2.5:1 fits best. No people in this photo, because the wave rule sits under it. Each `::: col` is one panel of content: about five feature cards, or a short paragraph, three cards and a callout.

### Full spread (`.full`)

```markdown
:::: {.panel .full}
::: hero-image
![](images/panorama.jpg){.fade}
:::

::: col
Inside left: one panel wide.
:::

::: {.col .two}
Inside center and right: laid out freely across the fold.
:::
::::
```

- The photo runs across all three panels (1.7 in tall). About 6.5:1; no people in it, since wave headers sit under it.
- **Keep all of the left `::: col` inside its panel.** Opening the cover shows it beside the flap (page 1 left), so it must read on its own and nothing may cross into the center.
- The `{.col .two}` block ignores the center/right fold: one heading across both panels, feature cards three across, and wide blocks such as `::: band`.
- A heading may run across the center/right fold here, but check the preview for a word sitting right on the crease.

### Band and flow (brochure only)

```markdown
::: band
### A key idea

One or two sentences.

::: flow
- **Review** Read the draft next to the case.
- **Correct** Edit anything that isn't right.
- **Approve** Only approved text is saved.
:::
:::
```

`band` is a tinted strip for one key idea; `flow` shows two to four numbered steps side by side. Best in a `{.col .two}` or `.wide` block. The same blocks work in sheets (see components.md).

## Fitting

Per panel, roughly: a heading plus 110–140 words, or a heading plus a photo plus 70 words, or a heading plus six feature cards. The build prints `[sheet] brochure page N, panel N: content runs ... past the panel bottom` for any panel that overflows; fix those first, then check the preview. Cut words first, then drop an image; never shrink type.

## Checks

- Two pages exactly.
- The dark back panel is the only dark object; no second dark card inside.
- Fictional label or placeholder note on the back when figures or images are illustrative.
- No wave rule with more than one burst.
- `\ ` between the last two words of a heading that would end on one word.
