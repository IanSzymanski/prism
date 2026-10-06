# Shared components

These blocks work in sheets, social posts, email headers and carousel panels (sizes adjust automatically). Decks use their own layouts (see deck.md) but read the same list and chart syntax.

Fenced divs need a blank line before and after. Nest by using more colons on the outer fence (`::::` around `:::`).

## Stats

```markdown
::: stats
- **41%** less time spent drafting case notes
- **Same day** median time to a finalized note
- **94%** of assisted drafts approved after review
:::
```

Two to four items. The bold part is the figure, the rest is its label (under ~10 words). Directly after an `##` heading it drops its top rule automatically; elsewhere use `{.stats .flush}` to drop it.

## Feature cards

```markdown
::: features
- []{.icon .ph-shield-check} **Human control** Review, correct and approve before the record changes.
- []{.icon .ph-clock} **Attention where it matters** Surface deadlines that need review.
:::
```

Two columns by default; `{.features .three}` for three. Each item: icon, bold title, one sentence. Keep counts even in two columns (2 or 4).

## Callout

```markdown
::: {.callout .tint}
#### []{.icon .ph-sparkle .accent} Core idea

One or two sentences.
:::
```

`.tint` for the main takeaway (one per page at most); plain `callout` for caveats, methodology or disclaimers.

## Checklist, columns, quote

```markdown
::: checks
- Short item
:::

::: cols
**First column** paragraph.

**Second column** paragraph.
:::

> Quote text, verbatim from content.md.
>
> [Name, Role]{.cite}
```

## Band and flow

```markdown
::: band
### CARA drafts, your staff decide

One or two sentences.

::: flow
- **Review** Read the draft next to the case.
- **Correct** Edit anything that isn't right.
- **Approve** Only approved text is saved.
:::
:::
```

`flow` shows 2–5 numbered steps side by side: use it for any process or workflow instead of feature cards. `band` is a tinted strip for one key idea and can hold a flow. Sheets and brochures; decks use the `steps` layout for the same thing.

## Icons

`[]{.icon .ph-NAME}` with any Phosphor icon name (phosphoricons.com). Ink by default; add `.accent` for the brand's accent colour. Reliable names: check, shield-check, lock, clock, users, file-text, files, chart-line-down, chart-bar, sparkle, link-simple, magnifying-glass, calendar-x, calendar, flag, chat-circle-text, user-check, info, warning, arrow-right, heart, house, handshake, clipboard-text, list-checks.

## Charts

Data must come from a table in content.md.

````markdown
```chart
type: bar
caption: Weekly documentation hours per caseworker, median.
highlight: Apr-Jul
marker: Apr | Case Amplify rollout
Feb: 16.4
Mar: 16.0
Apr: 12.8
```
````

| Setting | Charts | Meaning |
|---|---|---|
| `type` | all | `bar`, `hbar`, `line`, `donut` |
| `caption` | all | Caption and screen-reader label. Add "Fictional data." for illustrative pieces. |
| `unit` | all | Suffix for values: `%`, `hrs`, `min` |
| `highlight` | bar, hbar | Rows in the accent colour, rest grey: `Apr-Jul`, `Apr`, `last` |
| `marker` | bar, line | Dashed line before a row with a note: `Apr \| Rollout` |
| `labels` | bar, line | `ends` (default), `all`, `highlight`, `none` |
| `max` / `height` | bar, hbar, line | Axis top / chart height (default 210) |
| `series` | line | `A, B, C` then rows hold one value per series: `Feb: 17, 21, 16` (max 5) |
| `center` | donut | `62% \| with families` |

Choose: bar for change over time or before/after; hbar for comparing named things; line for trends or several series; donut for parts of a whole (max 5 slices).

## Images

The brand's logos are `![](prism:logo){.logo}` on light grounds and `![](prism:logo-on-dark){.logo}` on dark; the build fills them from the brand. Never copy a logo file into `images/`.

Images come from content.md (`![Caption](images/file.jpg)`, or `![Caption](brand:<id>)` for a photo from the brand's image library); images.md gives each one's orientation, role, print fit and focus. The build detects orientation itself and sizes the layout to it. Paths stay `images/<file>`.

**Crops.** Every slot that crops (hero band, media row, gallery, slide photo, post or story photo, blog header, email avatar) keeps the image's focal point in frame: images.py finds it, library photos carry theirs. Write `{focus="x% y%"}` on an image only when this format needs a different crop (`{.fade focus="50% 20%"}` keeps the top of a tall photo).

### Hero image (sheets)

```markdown
::: hero-image
![](images/office.jpg){.fade .shadow}
:::
```

The first block of the body, directly after the front matter. Landscape only, and only one per piece. Crops to a wide band (3.1 in tall; 2.4 in with `hero: small`, 1.8 in with `hero: x-small`) and fades into the page. Leave the caption empty unless the image needs a label (placeholder, photo credit, fictional); then keep it to that label.

### Media row: one image beside text

```markdown
::: media
![Caseworker on a home visit.](images/visit.jpg){.fade}

### Intake moved into the record

One or two short paragraphs, or a short list.
:::
```

- The image comes first inside the block; everything after it becomes the text column.
- Column split follows the photo: landscape half and half, square 40%, portrait 34%. The image keeps its own shape; only extreme shapes (wider than 2:1, taller than 3:5) are cropped.
- `{.media .flip}` puts the image on the right. Alternate flips when two media rows are close together.
- `.fade` fades the image toward the text. `{.media .top}` aligns text to the top instead of the middle.
- Text beside a portrait photo can be longer; beside a landscape photo keep it under ~70 words.

### Gallery: two or three images in a row

```markdown
::: gallery
![Team meeting.](images/meeting.jpg)

![Office.](images/office.jpg)
:::
```

All images share one shape: their own average when they are within 1.5× of each other (screenshots, a set of banners), otherwise 4:5 if most are portrait, else 3:2. No fade or shadow in galleries. Captions short or empty.

### Figure: one image on its own

`![Caption.](images/chart-photo.jpg)` in its own paragraph. Landscape runs full width; portrait and square are centred at a narrower width. Add `{.shadow}` only for the piece's one standout image.

### Choosing

| Situation | Layout |
|---|---|
| One strong landscape photo that sets the scene | hero image |
| A photo that illustrates one section | media row in that section |
| Two or three photos of equal weight | gallery |
| A photo that must be seen large (a screen, a document) | figure |
| Photo prints under 3 in (images.md) | gallery or leave it out of print; fine for social |

A photo of a person must not sit directly under an `##` heading's wave: give that heading `{.no-rule}`, or put a sentence of text between them.
