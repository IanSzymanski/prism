# Social posts (PNG images + captions)

Build: `run.sh social formats/social.md out/social`. One PNG per post, `<tag>-<post id>.png`, plus `<tag>-captions.md` (see Naming in SKILL.md). Also read components.md.

```markdown
---
title: Cedar Hollow social posts
---

:::: {#stat-41 .post .square .hero note="Illustrative example"}
[Case study · Child & family services]{.eyebrow}

::: stats
- **41%** less time spent on case notes, in four months
:::

One supporting sentence.

::: caption
Post copy for LinkedIn or Instagram, in paragraphs.

(Illustrative example: organization and figures are fictional.)
:::
::::
```

## Sizes and modifiers

| Class | Size | Use |
|---|---|---|
| `.square` | 1080×1080 | LinkedIn, Instagram feed |
| `.portrait` | 1080×1350 | Instagram, LinkedIn mobile |
| `.wide` | 1200×627 | Link previews on LinkedIn and X; charts |
| `.story` | 1080×1920 | Instagram and Facebook Stories, any full-screen vertical (see Stories below) |
| `.hero` | modifier | Makes a single stat huge |
| `.dark` | modifier | Site CTA colours; for quotes and closers. No mono text on it. |

- `#id` names the PNG. `note="..."` prints bottom-right (use for "Illustrative example").
- Each post needs a `::: caption` with the post copy, **inside** the post's `::::` fence (before the closing `::::`). It is not drawn on the image. The build fails with `[social] missing caption` when one is missing.
- Keep on-image text short: eyebrow, heading or stat, one sentence. The caption carries the rest.
- Quotes go on `.dark` posts; the heading wave never appears next to a person.
- Photos: a `.split` post puts `![](images/file.jpg){.photo}` on the right half with a fade (as in email.md); use the hero or a supporting image from images.md. Never a client or minor without confirmed consent.
- Typical set from one piece: a hero stat (square), a quote (square dark), a chart (wide), a features card (portrait).

## Stories (1080×1920)

```markdown
:::: {#story-review .post .story note="1 / 4"}
[Eyebrow]{.eyebrow}

## Heading with one *accent* word

One or two short sentences.

::: caption
Post copy.
:::
::::
```

The app's own interface covers the edges of a story, so every piece of text, the logo and the note sit inside the **safe area**: clear of the top 14% (270px: progress bar, profile, close button), the bottom 20% (384px: reply bar and stickers) and 88px at each side. Photos and backgrounds may run under the interface; text may not.

| Modifier | Layout | Use |
|---|---|---|
| (none) | Text on the light wash, heading wave under the heading | One idea, one short paragraph |
| `.dark` | Dark CTA background | Quotes, closers, a call to action |
| `.photo-top` | Photo fills the top ~58% and fades into the page; text sits low, logo beside the note | A strong landscape or square photo |
| `.photo-full` | Photo fills the whole story under a dark scrim; white text low in the safe area | A portrait photo with space at the bottom; heading and eyebrow only |
| `.photo-card` | Rounded photo card inside the safe area, text below | Screens, documents, detail shots |
| `.reel` | Keeps the bottom 35% (672px) clear instead of 20% | Reels covers, or stories with a link sticker or poll |

- Photos: `![](images/file.jpg){.photo}` as the first line of the post. Portrait photos (9:16 or 4:5) suit `.photo-full`; landscape or square suit `.photo-top` and `.photo-card`. No heading wave on any story with a photo.
- Keep it short: eyebrow, heading (under ~8 words) and one or two sentences. `.photo-full` takes a heading and eyebrow only.
- The build checks every story and prints `[social] story <id>: "<text>" is outside the safe area` or `runs into the logo`. Shorten the text; never shrink it.
- `run.sh social formats/social.md out/social --guides` also writes `out/social/_guides/<id>.png` with the covered areas shaded red. Use those for the visual check; send only the plain PNGs.
- A set of stories reads in order: number them with `note="1 / 4"`.
