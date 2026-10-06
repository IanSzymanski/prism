# Carousel (Instagram / LinkedIn, 1080×1350 panels)

Build: `run.sh social formats/carousel.md out/carousel`. All panels render on one canvas so one wave line and the background washes run across every swipe, then the canvas is cut into PNGs named `<id>-01.png`, `-02`… Also read components.md.

```markdown
::::::: {#responsible-ai .carousel}

:::: {.post .panel .cover burst="0.97" note="Swipe →"}
[Five habits for human services teams]{.eyebrow}

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

caseamplify.com
::::

::: caption
Post copy and hashtags for the whole carousel.
:::

:::::::
```

- 5–10 panels. First is `.cover` (uses `#` heading), last is `.dark .end`.
- `burst` places each panel's wave burst (0 = left edge, 1 = right). Vary it (e.g. 0.6, 0.3, 0.7, 0.35, 0.66) so the line reads as one shape; `0.97` on the cover spills into panel 2 as a swipe cue.
- `note` is the counter: `"02 / 07"`; cover uses `"Swipe →"`.
- `[01]{.num}` numbers the point on content panels.
- Panels accept paragraphs, `checks`, `stats`, and a `steps` numbered list (`::: steps` around `1. **Review** the draft`).
- One point per panel, heading plus at most two sentences or four list items. Protect line breaks with a non-breaking space (`accept\ it.`) when a heading would leave one word alone.
- Keep cover text inside the centre 3:4 area; Instagram crops the grid thumbnail.
