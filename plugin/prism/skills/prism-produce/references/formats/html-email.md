# HTML email (designed email, email-safe HTML)

Build: `run.sh email formats/html-email.md out/html-email`. The whole email, not just a header image (for header images only, see email.md). Also read components.md for the shared syntax; email has its own, smaller set of blocks below because email clients can't run the sheet styles.

The build writes `<tag>.html` (inline styles, plus one small `<style>` block for phones, which can't be inline), `<tag>.txt` (the plain-text part), `images/` (2x, compressed, each `<tag>-<name>`), `<tag>-images.zip` (the images, uploaded beside the HTML in Zoho Campaigns) and `<tag>-preview.png` (desktop and phone, light and dark, plus a simulated Outlook dark view).

```markdown
---
layout: email
template: announcement          # announcement | newsletter | letter
subject: How one agency cut documentation time by 41%
preheader: Four months, no added staff. An illustrative case study.
issue: October 2026 · Issue 4   # newsletter masthead only
image-base: https://cdn.example.org/email/2026-10/   # where images/ will be hosted; leave out when uploading the images zip
note: Illustrative example. Names and figures are fictional.
scheme: light                   # light (default) | auto (adds dark CSS; Outlook then recolours twice); or --scheme on the build line
---

::: header
[New case study]{.eyebrow}

# How Harbor Point got its *afternoons* back

One sentence standfirst.
:::

Hi ${Contacts.First Name},

Opening paragraph.

![Caseworker reviewing a draft.](images/visit.jpg){.hero dark="images/visit-dark.jpg"}

[Read the case study](https://example.com/...){.button}

::: footer
<brand name> · street address

[Unsubscribe]($[LI:UNSUBSCRIBE]$) · [View in browser]($[LI:VIEWINBROWSER]$)
:::
```

## Templates (layout options)

| Template | Use for | Top of the email |
|---|---|---|
| `announcement` | One story with one call to action: case study, launch, event | Tinted band with logo, eyebrow, headline, standfirst |
| `newsletter` | Several items of equal weight | Masthead (logo left, `issue` right), then eyebrow and headline |
| `letter` | Personal, one-to-one outreach and follow-ups | Small logo, plain page, no band; reads like a person wrote it |

## Blocks

| Block | Syntax | Notes |
|---|---|---|
| Header | `::: header` with `[...]{.eyebrow}`, `# Headline`, optional paragraph | Once, first. Accent emphasis `*word*` at most once |
| Heading | `##`, `###`, `####` | `##` serif section heading; `####` small mono label |
| Paragraph, list | plain Markdown | Lists as `-` or `1.` |
| Image | `![Alt](images/x.jpg)` | Inset at 536 px. `{.hero}` runs edge to edge at 600 px. `dark="..."` swaps in a dark-mode version (`scheme: auto` only); `href="..."` links it |
| Button | `[Label](https://...){.button}` alone in a paragraph | One primary button per email. Further actions use `{.button .secondary}` (outlined) or a text link |
| Stats | `::: stats` (2–3 items, as in components.md) | Stack on phones |
| Features | `::: features` (icon, bold title, one sentence) | One per row in email; icons are drawn as images in light and dark |
| Cards | `::: cards`, each item `![Alt](img) **Title** sentence. [Link](url)` | Two per row, stack on phones. Newsletter items |
| Media | `::: media`: image, then `###`, text, optional button | Image left; `{.media .flip}` puts it right |
| Callout | `::: callout` with `####` label and text | Tinted box; caveats and "good to know" |
| Quote | `>` quote, `>` blank, `> [Name, Role]{.cite}` | Verbatim from content.md |
| QR | `::: {.qr url="https://..." label="Register for the summit"}` with text | No code: a code can't be scanned from the screen it is read on. The text, then a link to `url` labelled with `label` (else the address). Write text that works without the code ("Register in a minute", not "Scan to register") |
| Divider | `::: ornament` / `:::` or `---` | `ornament` is the brand's own divider (its ornament): never next to a person's photo, a quote or a signature (use `---` there) |
| Signature | `::: signature`: optional headshot, name, role | Letter template. The headshot is cropped square and round |
| Footer | `::: footer` | Required: sender's postal address and an unsubscribe merge tag. Sits under the card |

## Rules

- **One purpose, one primary button.** The build warns at more than two primary buttons.
- **Subject** about 40 to 60 characters; **preheader** 40 to 100 characters, adding to the subject rather than repeating it. Both are in the front matter and come from content.md.
- **Merge tags and shortcodes** go in exactly as the sending tool writes them; the build passes them through untouched, in text and in links: Zoho CRM `${Contacts.First Name}`, Zoho Campaigns `$[LI:UNSUBSCRIBE]$`, `{{...}}`, `{%...%}`, `*|...|*`, `%%...%%`. When content.md doesn't say which tool sends the email, assume Zoho Campaigns, write its merge tags, and note the assumption in log.md.
- **Links** are full `https://` addresses (or a merge tag). UTM parameters are fine.
- **Images:** every image has alt text that says what it shows. Use photos from content.md and images.md; until the user supplies them, `prism:placeholder` with `dark="prism:placeholder-dark"`, labelled as placeholders. Photos need about 1200 px width for a hero and 1100 px for inset images.
- **Outlook's own dark mode** ignores the email's dark CSS when HTML is pasted, and in classic Outlook: it recolours everything itself. The brand's email palette (its profile's `m365.email` block, checked by `run.sh palette <brand>`) is chosen to survive that (pure white surfaces, a darker text accent, the main accent only for fills and rules). Never set colours inline in a format file; check the "Outlook dark (simulated)" view in preview.png.
- **Images in Outlook dark** are never recoloured or swapped, so a light screenshot stays a bright block. Prefer screenshots cropped tight to the part that matters, or a mid-tone frame; the `dark=` version shows only in clients that run the dark CSS.
- **Dark mode is left to each client.** By default the email is light only, and Outlook, Gmail and other clients apply their own dark mode to it. That is why the palette is fixed. Apple Mail respects "light only" and shows the email light. `scheme: auto` adds our own dark CSS for Apple Mail and iOS, but Outlook applies that CSS and then recolours it again to mid-grey, so use it only for sends that won't reach Outlook.
- **With `scheme: auto`**, dark mode follows the reader's setting. Colours switch automatically; add `dark="..."` only for images with a light background or dark text baked in (screenshots on white, charts, logos). The logo is handled by the build.
- **Hosting:** to paste the HTML into a tool, set `image-base` to the folder where `images/` will be uploaded. When uploading the images zip, leave it out.
- Illustrative pieces set `note:` (shown under the footer and in the plain text) and keep "illustrative" on any quote attribution.
- The plain-text part is generated; never write it by hand.

## Build warnings

Act on every `[email]` line before delivering: missing or low-resolution images, missing alt text, links that aren't https, a brand ornament beside a person, too many primary buttons, subject or preheader length, a shortcode that isn't closed, and `email.html` over 100 KB (Gmail clips at 102 KB).

## Outlook markup (built in)

The builder follows Zoho's Outlook guidance, and the build checks its own output for it: spacing, rules and buttons are table cells (Outlook ignores padding, width and height on `<div>`, `<p>` and links); every text element has a line-height; images carry width as attribute and style, with no margins; no `<button>`, float, position or background images; light-only emails carry only the classes the phone styles need. An `[email] Outlook:` warning means a builder bug, not a writing problem. Animated GIFs are kept as they are; Outlook shows only the first frame, so it must carry the message.
