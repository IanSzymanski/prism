# Blog post (header image, chart images, post text for the CMS)

Build: `run.sh blog formats/blog.md out/blog`. Writes `<tag>-header.png` (1920×1080), `<tag>-chart-NN.png` for each chart, `<tag>-post.md` and `<tag>-post.html` (see Naming in SKILL.md) (the body, charts as images, ready to paste into WordPress). Also read components.md for chart syntax.

A blog post is mostly words: the body stays plain Markdown (paragraphs, `##` and `###`, lists, quotes, links). No sheet components (stats, feature cards, callouts) in the body; the site's own blog styles format it. Charts are the one exception, and only for posts with real data points.

## Front matter

```yaml
---
title: Documentation burden is a service-delivery problem
type: educational          # educational | insights | features | spontaneous | impact | changelog
slug: documentation-burden # seeds the header, so keep it stable once published
author: Jane Doe
role: Customer success lead
excerpt: One or two sentences for the blog index and social previews.
tags: documentation, human review
header-image: images/photo.jpg    # optional: a photo (faded into the gradient) or, for features, a product screenshot
release: Release 2.4 · September 2026   # changelog only
---
```

The title, author, role, excerpt and tags go into the CMS fields; `<tag>-post.md` repeats them as front matter for reference and `<tag>-post.html` is the body only.

## Headers

The page already shows the title, author, tags and the site logo, so the header carries **none of them**. A header is one of four things:

| Header | When | What it is |
|---|---|---|
| **Gradient** | No image supplied (the default) | A broad, low-contrast brand gradient with a light grain. Tone by post type: educational light or mist; insights mist, light or deep; features and impact deep or vivid; spontaneous any |
| **Image** | A photo is uploaded with the content (`header-image`) | The photo fills about 64% of the frame on one side and fades into the gradient on the prism-fade ramp |
| **Screen** | A features post with a product screenshot | The screenshot on a card over the gradient, not faded |
| **Series** | A recurring series (`type: changelog`, or `series: <name>`) | The series name set large (never the post title), plus an optional `release:` line such as "Release 2.4 · September 2026" |

- The slug seeds the gradient's angle, glow, tone and the image's side: the same slug always gives the same header, different slugs different ones. Keep the slug stable once published.
- To steer one: `tone: light | mist | deep | vivid`, `image-side: left | right`, or `header: gradient | image | screen | series`.
- No section rules or other ornaments on blog headers beyond the brand's header art.
- Photos come from the user, uploaded with the notes; ask for one at intake for posts that carry weight (a flagship piece, a launch, a customer story). Photos of people need the same permission as everywhere else; a screenshot must be real product UI with no client data.

## Charts in posts

Only for posts built on real data points (an insight with numbers from implementations, an impact post with approved outcomes). Same ```chart syntax as sheets; each becomes a 2x PNG and the post links it with its caption as alt text and figure caption. Illustrative data says so in the caption.

## Checks

- Number check against content.md, as for every format.
- `run.sh verify out/blog` before delivery (header and chart PNGs carry the build fingerprint).
- Look at the header image once; send it, the charts, the post .md and the post .html.
