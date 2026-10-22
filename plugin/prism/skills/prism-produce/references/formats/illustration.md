# Illustration (an animated UI mockup for a website feature page)

An abstract, stylized illustration of one product feature, built as a single HTML block for the brand's website. It is not a screenshot: it shows the feature and the problem it solves at a glance, with everything else left out or reduced to placeholders. It plays once, about 5 seconds, when it scrolls into view, then holds a still finished frame.

`run.sh illustration formats/illustration.md out/illustration` writes:

| File | What |
|---|---|
| `<tag>-dark.html`, `<tag>-light.html` | The single HTML block, dark and light: one `<style>`, the markup (already the finished frame) and one `<script>`. Paste it into the site as it is. It uses the site's own GSAP and ScrollTrigger and carries no copy of them |
| `<tag>-bench.html` | The bench: a preview page with room at the top, then the mockup in dark and light beside its heading and copy, each block's HTML under it with a Copy button. It carries GSAP itself, so it plays anywhere |
| `<tag>-dark.png`, `-light.png`, `-dark-phone.png`, `-light-phone.png` | Finished frames at desktop and phone width |
| `<tag>-frames.png` | The motion as a strip: 0 %, 20 %, 40 %, 60 %, 80 % and the end |

`run.sh illustration bench out/bench.html formats/a.md formats/b.md ...` builds a feature-page bench of several, in order, sides alternating on a 12-column grid (stacked under 1024 px); two neighbors on the same ground stop it.

The brand styles the type in its profile (`illustration`): the class prefix, the glass, the outline colors, the approved grounds, the trigger line, how the block joins the site's boot script, words never to use and its own rules. Read the brand digest's illustrations section before writing.

## Front matter

```yaml
---
title: Active cases, next steps        # the mockup's name (in the bench and the block's comment)
feature: Case monitoring               # the real feature it shows (from content.md)
problem: A full caseload hides the case that needs attention today.
answer: Cases that may need attention rise to the top, for staff to review.
heading: See which case needs you next # the feature page's heading beside it (bench); default title
copy: One or two sentences beside it   # the feature page's copy (bench); default answer
ground: violet                         # one of the brand's illustration grounds; dark and light are both built
size: tile                             # tile (square, default) | wide (16:10) | tall (4:5) | full (fills the screen)
seconds: 5                             # about 5 (6 for full); the build fits the steps to it
key: case-monitoring                   # the block's id on the site (default: from feature); keep it once it ships
figures: illustrative                  # mockup data is fictional: required when any number shows
alt: Text for screen readers           # default "feature: answer"
phone-aspect: 4/5                      # the phone composition's shape (default 4/5; 9/16 for full)
phone-scale: 1.7                       # type size on a phone, against the desktop (default 1.7)
---
```

Every mockup gets the layout that best shows its feature. Never reuse one layout across features, and never put two mockups that sit next to each other on the same ground.

## Modules

Modules are placed on the tile with `box="x y w"`: left, top and width in percent of the tile (height follows the content; a fourth number fixes it). `phone="x y w"` places it for the phone composition (below 560 px), which is its own layout, not a squeezed one. `.wide-only` leaves a module, element or tether out on the phone.

```markdown
:::: {.panel #cases box="15 17 66" phone="5 9 90" title="Active Cases"}
[Jane Doe | Intake]{.row .key #jane pill="Urgent" tone=urgent}
[]{.ghost}
[John Bro | Referral]{.row .key pill="Stable" tone=stable}
::::

::: {.card .arrow #next box="44 67 44" phone="14 74 80" icon=sparkle}
View AI-suggested next steps
:::

[]{.tether from=jane to=next}
```

- `::::` **panel**: a large glass panel, with an optional serif `title=` (or a `#` line first). Use `::::` so `:::` blocks can sit inside.
- `:::` **card**: a smaller, brighter glass card that floats (callouts, sources, small records). `icon=` (the brand's icon names) on its left, `.arrow` on its right. A card with one line sets it as its text.
- **tether**: `[]{.tether from=a to=b}` joins two elements with `#id`s. Tethers are drawn over the modules, never behind them, measured from the layout so they always meet their ends. `sides="r l"` (or `phone-sides=`) picks the edges: `r`, `l`, `t`, `b`. A tether draws as soon as both of its ends are on screen.
- `::: notes`: direction, never on screen.

Modules that overlap are fine: every module sits on a copy of the ground beneath its glass, so no outline under it shows through.

## Elements (inside a module, one per line, in story order)

| Element | Markdown | What |
|---|---|---|
| Row | `[Name \| Sub-label]{.row pill="Urgent" tone=urgent avatar="JD"}` | A list row: avatar (initials, or a photo path), name, sub-label, status pill. `.key` makes it a brighter band, the row that matters |
| Placeholder row | `[]{.ghost}` (`bars=1..3`) | An empty circle and bars: the rows that don't matter |
| Bars | `[]{.bars n=2 w="80 55"}` | Placeholder text lines, widths in percent |
| Line | `[Text]{.line}` or a plain line | Body text. `.strong`, `cite="1,2"` (numbered outline circles), `.mark` (a highlight: a brighter band over the whole line), `.ai` (AI output: it types in word by word) |
| Title | `# Text` or `[Text]{.title}` | A serif heading |
| Label | `[Text]{.label}` | Small monospace capitals |
| Quote | `[Text]{.quote}` | Quoted speech, in the serif. `.mark` highlights it |
| Field | `[Label \| Value]{.field}` | A form field. `.missing` outlines it in the review tone: something still needs a person |
| Pill | `[Text]{.pill tone=review}` | A status pill on its own. `fx=pop` gives it its own beat |
| Tags | `[A, B, C]{.tags}` | Outline chips |
| List | `- item` lines | Items with outline dots |
| Button | `[Approved]{.button .approve was="Approve note"}` | An outline button. `.approve` adds a check and presses once, ending the story; `was=` is its text before the press |

`tone=` is one of `urgent`, `stable`, `review`, `accent`, `done`, `neutral`; the brand sets each one's outline color for dark and light. `was="..."` (and `was-tone=`) on a pill, button or row (its pill) shows the earlier state first and swaps to the written one on its beat, so the markup is always the finished state.

## Look (the build enforces it)

- Glass: translucent panels on the brand's gradient ground; on light grounds the glass is frosted white, never solid cards.
- Color only ever outlines (and colors the text inside them): pills, citation circles, tags, buttons, dots, avatars. More emphasis is brighter glass, never a hue. The build fails on a colored fill.
- Highlights cover the whole line, top to bottom.
- Grounds are only the brand's approved ones, drawn as large radial glows that fade on a smooth curve.
- Type is the brand's: serif for titles and quoted speech, sans for the interface, monospace capitals for labels.

## Motion (the build does it)

- The story runs in the file's order: each module rises in with its contents; `.key` rows brighten, `.mark` lines highlight, `.ai` lines type, swaps change state, tethers draw, `.approve` presses. Order it as the problem, then the answer; where the feature shows AI output, end on a person reviewing or approving it.
- The steps fill about `seconds:`. `at=` on any element or module pins its start in seconds; `fx=` sets its move (`rise`, `fade`, `pop`, `brighten`, `mark`, `type`, `draw`, `swap`, `press`, `none`).
- It plays once, when the block's top crosses the brand's trigger line; a played flag records it. Nothing idles or loops after; any pulse plays once.
- Without JavaScript, without GSAP or with reduced motion, the finished frame shows: the markup is that frame.
- Tethers draw by their stroke over about 0.75 s, with round caps, hidden until they start.

## Copy

Keep one key fact per element (the build warns past the brand's word limit), fictional people and data only, and the brand's terms (its claims rules apply: no capability shown as shipped that isn't). The build fails on any word in the brand's `never` list. A number on screen needs `figures: illustrative`, and never reads as a real result.

## Checks before delivering

The build fails or warns on each; read every line it prints.

1. A stranger names the feature and the problem from the finished frame alone (look at the PNGs).
2. Nothing on screen the feature doesn't need: cut it or make it a placeholder.
3. No colored fill; no hue used for emphasis.
4. Highlights full line height; the ground approved, smooth and different from its neighbors.
5. No outline showing under an overlapping module; no tether behind a module.
6. Plays once, about 5 s, ends still; reduced motion shows the finished frame (the build compares the frames).
7. Desktop and phone both read (type no smaller than 10 px on a phone), with no sideways scroll on the bench.
