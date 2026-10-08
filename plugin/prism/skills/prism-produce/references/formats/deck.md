# Deck (editable PowerPoint)

Build: `run.sh deck formats/deck.md out/<tag>.pptx` (tag: see Naming in SKILL.md). 16:9 widescreen, native PowerPoint text and charts. Fonts: the brand's Office fonts (users install them from `brands/<brand>/office`; the first deck comes with the pack).

## Front matter

```yaml
---
title: How *Harbor Point* got its afternoons back
subtitle: One sentence.
eyebrow: Case study · Illustrative example
footer: <brand name> · Illustrative example, fictional figures
image: images/office.jpg        # optional: the hero photo, shown on the right half of the title slide
---
```

## Slides

Each slide is a block. Use `::::` for the slide so `:::` notes can nest inside.

```markdown
:::: {.slide .stats}
## At a *glance*

- **41%** less time drafting case notes
- **Same day** to a finalized note
- **94%** of drafts approved after review

::: notes
Speaker notes, plain sentences.
:::
::::
```

| Layout | Content it reads |
|---|---|
| `title` | Front matter only (leave the block empty apart from notes). Always first. |
| `stats` | `##` heading + bullet list of `**figure** label` (2–4 items) |
| `features` | `##` heading + bullets `[]{.icon .ph-NAME} **Title** sentence` (3 items fit best) |
| `steps` | `##` heading + numbered list `**Step** sentence` (3–5 items). Drawn as a workflow: one line with a dot per step. Use it for any process story (conversation → draft → review → record → follow-up) instead of feature cards. |
| `quote` | A blockquote with `[Name, Role]{.cite}`, nothing else |
| `media` | `##` heading (drawn with a plain line, never the brand's section rule) + one image + `###` subhead, paragraphs or a short list. Image on the left (`{.slide .media .flip}` for right), sized to its orientation; add `{.fade}` on the image to fade it toward the text. |
| `chart` | `##` heading + one chart block + optional 1–2 short paragraphs (takeaway beside the chart). bar, hbar, line, donut. |
| `qr` | `##` heading + paragraphs or a short list beside a QR code: `{.slide .qr url="https://..." label="example.com/x"}`. Code right (`.left` for left, `.center` above centred text). `bg="black"` or `"transparent"` as in components.md; `image="images/qr.png"` uses an uploaded code instead. |
| `closing` | `[Eyebrow]{.eyebrow}` + `##` + 1–2 paragraphs; last paragraph is the URL. Dark background. Always last. |
| `content` | `##` heading + paragraphs and bullet or numbered lists. For sources, agendas, anything without a better layout. Each paragraph and item is its own line; type shrinks as the text grows. |

`{.slide .<layout> .no-rule}` swaps the heading's section rule for a plain line on any slide.

The build estimates whether each heading, card, step and text box fits and prints `[deck] slide N (<layout>): ... may not fit` when it doesn't. Shorten the text named; don't rely on PowerPoint shrinking it.

Rules: 6–10 slides. One idea per slide. Headings under ~6 words. Body text a sentence, not a paragraph. Put detail in notes, not on the slide. Label illustrative decks in `footer`.
