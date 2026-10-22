# Carousel (Instagram / LinkedIn, 1080×1350 panels)

Build: `run.sh social formats/carousel.md out/carousel`. All panels render on one canvas so the brand's thread (a line or strip, when the brand draws one) and the background washes run across every swipe, then the canvas is cut into PNGs named `<id>-01.png`, `-02`… Also read components.md.

```markdown
::::::: {#responsible-ai .carousel}

:::: {.post .panel .cover burst="0.97" note="Swipe →"}
[Five habits for busy teams]{.eyebrow}

# Using AI in casework, *responsibly*

One sentence.
::::

:::: {.post .panel burst="0.6" note="02 / 07"}
[01]{.num}

## AI drafts. *People decide.*

One or two sentences.
::::

:::: {.post .panel .dark .end burst="0.5" note="07 / 07"}
[Save this for your team]{.eyebrow}

## Focus on *what matters*

One sentence.

example.com
::::

::: caption
Post copy and hashtags for the whole carousel.
:::

:::::::
```

- 5–10 panels. First is `.cover` (uses `#` heading), last is `.dark .end`.
- `burst` places where the brand's thread peaks on each panel (0 = left edge, 1 = right). Vary it (e.g. 0.6, 0.3, 0.7, 0.35, 0.66) so the line reads as one shape; `0.97` on the cover spills into panel 2 as a swipe cue. Brands whose thread has no peak ignore it.
- `note` is the counter: `"02 / 07"`; cover uses `"Swipe →"`. A brand may drop the counters (`options.social.counter: false`; "Swipe →" stays) and its thread line (`options.social.thread: false`, so `burst` does nothing); leave both out of the format file then.
- Grounds: light (default), `.dark` and `.purple` (the brand's purple ground, dark text colours). Put at least one dark or purple panel in the middle, not only at the end.
- `[01]{.num}` numbers the point on content panels. A brand may drop them (`options.social.numbers: false`); then leave them out.
- Panels accept paragraphs, `checks`, `stats`, a `steps` numbered list (`::: steps` around `1. **Review** the draft`) and charts (a ` ```chart ` block, components.md). In a carousel a chart draws its text larger for phones, and on `.dark` or `.purple` panels it takes the on-dark colors with solid bars; one chart a panel, under a short heading, at most six bars or rows.
- Stat figures are big type: keep each to 3 characters or fewer (`41%`, `9x`, `$2M`, `88`) so it never oversets; round it, or move the unit into the label (`**2.6** hours a day`). A brand's `stats` check reports longer ones (its `options.social.stat_chars` sets the limit).
- One point per panel, big type: a heading plus at most one short sentence or four short list items. No two panels in a row with the same layout (heading and line, then a list or a stat, then a quote). A brand's checks (`options.social.checks`) report panels over 30 words, repeated layouts, a single ground, repeated photos and stat figures over 3 characters. Protect line breaks with a non-breaking space (`accept\ it.`) when a heading would leave one word alone.
- Keep cover text inside the centre 3:4 area; Instagram crops the grid thumbnail.
