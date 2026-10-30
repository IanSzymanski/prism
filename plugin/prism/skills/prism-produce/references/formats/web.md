# Website page (a whole page for the brand's WordPress site, as blocks)

A landing page, solution page or product page laid out from content.md, built as the block markup the brand's WordPress site saves. It is pasted into a draft page (or created by the site's bridge once one is set up); people review the draft on the site and publish it.

`run.sh web formats/web.md out/web` writes:

| File | What |
|---|---|
| `<tag>-blocks.html` | The page's block markup. Paste it into a new draft's Code editor (Options ⋮ > Code editor) and save |
| `<tag>-page.json` | The page's details for the site: title, slug, parent, template and its page settings, search title, meta description, focus keyphrase, every image slot (its name and alt text, and the photo to upload with its hash and focal point) and the site photos it uses |
| `images/<tag>-<slot>.<ext>` | The piece's photos to upload to the media library, one per slot |

The brand decides what the blocks are. A brand with a site kit (profile `web`) writes its site's own components, patterns and motion; any other brand gets plain WordPress blocks with `prism-web-` classes for its theme to style. Read the brand digest's website section before writing: it names the site's templates, motion options and rules.

There is no preview image: the page's look comes from the site's theme. The layout is reviewed in design mode; the draft on the site is the true preview.

## Front matter

```yaml
---
layout: web
title: Faster intake for Harbor Point    # the page's title in WordPress
slug: faster-intake                      # its address; keep it once the page is live
post: 0                                  # the page's WordPress id once it exists (block ids start with it); 0 for a new page
parent: 0                                # the parent page's id, 0 for none
template: inner                          # one of the brand's page templates (its page settings), from the digest
seo-title: Faster intake | Harbor Point  # the search-result title, about 60 characters
description: One or two sentences for search results, about 155 characters.
keyphrase: faster intake                 # the focus keyphrase
---
```

## The page

A page is a run of sections. The build puts the space between sections and the brand's end of page in by itself: never write spacers, rules or an end mark.

```markdown
::: hero
[Intake for county programs]{.eyebrow}

# Give your team its *mornings* back.

[Referrals arrive complete, so the first call is about the person, not the paperwork.]{.lede}

One or two sentences on what the product does.

[Book a demo](/contact/){.button icon=calendar-check-fill}
[See how it works](/how-it-works/){.button .secondary icon=play}

[Made for:]{.eyebrow}

- intake coordinators
- program managers

![An intake coordinator on a call.](prism:placeholder){slot=hero}
:::

## Intake is a *paperwork* problem {cols=45/55}

::: media
![A coordinator sorting referral forms.](images/forms.jpg)

[One sentence that leads the text.]{.lede}

A paragraph or two.

- A short list
- of what changes
:::

## Every part of the *week* {.center}

[Before the first call]{.eyebrow}

## Referrals that arrive *complete*

::: media
...
:::
```

| Block | Markup | What |
|---|---|---|
| Hero | `::: hero` | First, once: eyebrow, the page's `#` title, lede, a paragraph, buttons, then optionally a small label (a second eyebrow) with a short list of who it is for, and one image |
| Section heading | `## Heading`, with `[Eyebrow]{.eyebrow}` on the line above it when it has one | Opens a section. Whatever follows (a media row, cards, a card stack, the FAQ) belongs to it |
| Centered heading | `## Heading {.center}` | No ornament and no eyebrow: introduces the run of sections after it ("Every part of the week") |
| Media row | `::: media` | One image beside a lede, paragraphs and a list. The image comes first in the block |
| Feature cards | `::: features` with `- []{.icon .ph-NAME} **Title** One sentence.` per card | A 2 × 2 grid (four cards), under a section heading |
| Card stack | `:::: stack` holding `::: features` (three cards) then a lede and paragraphs | Cards in a column beside text: for proof points beside a short argument |
| Band | `:::: band` holding an eyebrow, `##` heading, a sentence, a button, then `::: features` (up to five cards) | A dark panel that sums the page up. Once per page |
| Closing card | `::: cta-card` with `##` heading, one sentence, a `{.button}` and a `{.button .secondary}` | The page's call to action. Once, near the end |
| FAQ | `::: faq` with `### Question` then the answer's paragraphs | Under its own heading ("Frequently asked *questions*"), near the end |

**Sides.** Headings and media rows alternate sides by themselves, starting on the left: a heading and the media row under it take the same side, and the next section takes the other. Moving sections in design mode keeps the zigzag. `{.left}` or `{.right}` on a heading or media row pins that one, and the page alternates on from it; use it only when someone asks.

**Options** on a heading or block: `cols=45/55` sets the two column widths (they add up to 100), and the brand's motion option when its digest has one (`::: {.media cols=60/40 rise=settle}`).

## Text

| Element | Markdown | Notes |
|---|---|---|
| Eyebrow | `[Text]{.eyebrow}` | A few words above a heading |
| Lede | `[One sentence.]{.lede}` | Leads a text column |
| Paragraph, list | plain text, `- item` | Blank lines between elements |
| Buttons | `[Label](/contact/){.button}` then `[Label](/events/){.button .secondary}` on the next line | Primary, then secondary (outlined); one or two together. `icon=` takes a Phosphor name, with a weight (`calendar-check-fill`) or in the brand's weight. Pages on the site are paths (`/contact/`); `https://` links open in a new tab |
| Emphasis | `*word*` | The accent word, once per heading at most |
| Bold, link | `**bold**`, `[text](url)` | |

## Images

- **The piece's photos** (content.md and images.md): `![What it shows.](images/visit.jpg)`. The build makes it an image slot named after the file, copies the photo into `images/` for upload with its focal point, and the site swaps it in. `{slot=name}` names the slot.
- **Library photos**: `![What it shows.](brand:<id>)`, the same way.
- **A photo the piece doesn't have yet**: `![What the photo should show.](prism:placeholder){slot=team}`. The slot shows the brand's placeholder photo, its alt text starts "[Image slot: team]", and the build lists it as needing a photo.
- **A photo already on the site**, only when someone gives one: `![What it shows.](https://example.com/wp-content/uploads/visit.webp){id=4321}` with its media library id.
- Every photo gets alt text that says what it shows (never "image of"). A photo of a person needs the same permission as everywhere else.

## Copy

Every word and number comes from content.md, as in every format. A web page carries more of it than a sheet: the hero states the problem and the promise, each section one idea with its proof, the band what changes overall, the closing card the next step. FAQ answers restate content.md's answers; never add a question the content doesn't answer. Bracketed placeholders from content.md (`[X hours per week]`) stay bracketed.

## Checks

The build stops on: an unknown block, a hero that isn't first, two closing cards, text outside a block, an eyebrow that isn't directly above a `##`, a `#` outside the hero, widths that don't add up to 100, an icon Phosphor doesn't have, a missing photo, a site photo without its id, one slot name for two photos, a template or motion the brand doesn't have, and markup that doesn't parse as blocks or repeats a block id. It warns (`[web] ...`) on: two accent words in a heading, cards, a media row, stack or FAQ with no heading in its section, a photo without alt text, an icon the site hasn't used yet, a missing or long description or search title, and the brand's own rules. Act on every line.

## Deliver and revise

- `run.sh verify out/web`, then send the blocks file, page.json and the images. Say in one line each: the blocks go into a new draft's Code editor; each slot's photo is uploaded and swapped in (its alt text names the slot); the template, search title, description and keyphrase are in page.json. Pages are created as drafts; people approve and publish.
- Revisions follow the two lanes. When the page was edited in WordPress after it was pasted, ask for its markup (Code editor, copy all) before rebuilding, and run `run.sh web compare out/web/<tag>-blocks.html <their copy>.html`: it lists every block that changed. Carry wording changes into content.md and layout changes into the format file, so the rebuild doesn't undo them.
