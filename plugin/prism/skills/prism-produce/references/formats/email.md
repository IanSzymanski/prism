# Email headers (PNG at 2x + subject lines)

Header images only, for an email built elsewhere. For the whole email as HTML, use html-email.md.

Build: `run.sh social formats/email.md out/email`. Same builder as social posts. Images are 1200px wide for a 600px email. Also read components.md.

```markdown
:::: {#case-study-light .post .email .split note="Illustrative example"}
[New case study]{.eyebrow}

## How Cedar Hollow got its *afternoons* back

One sentence.

![](prism:placeholder){.photo}

::: caption
Subject: How one agency cut documentation time by 41%

Preheader: Four months, no added staff. (Illustrative example.)

Photo: what the photo should show.
:::
::::
```

| Class | Size | Notes |
|---|---|---|
| `.email` | 1200×420 | Logo top-left |
| `.email.short` | 1200×300 | Newsletter mastheads |
| `.email.tall` | 1200×520 | Headers with a photo and more copy |
| `.split` | modifier | Photo fills the right half and fades in; the heading wave is removed |
| `.dark` / `.hero` | modifiers | As in social posts |

- Photo slot: use the project's hero image from images.md when there is one; otherwise `![](prism:placeholder){.photo}` or `prism:placeholder-dark` until the user supplies a real photo. Paths are relative to the format file; the orchestrator copies placeholders and user photos into `formats/images/`.
- Caption holds Subject, Preheader, and a Photo brief when there is a photo slot, each as its own paragraph.
- Make light and dark versions only when asked; otherwise pick one that suits the email.
