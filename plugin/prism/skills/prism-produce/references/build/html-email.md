# Building: HTML email

The prism-produce skill's build, check and delivery notes for this format (sections 2 and 3); read only for a piece that has it.

## Build

- html-email: `.prism-kit/run.sh email formats/html-email.md out/html-email` (`<tag>.html`, `<tag>.txt`, images/, `<tag>-images.zip`, `<tag>-preview.png`). It prints `[email]` warnings; act on each (the card lists them). Look at preview.png in the visual check: all four views, light and dark, nothing unreadable in dark mode.

## Deliver: what each file is for

- HTML email: in the sending tool (content.md's `Send from:`, else the brand's email tool from `run.sh brands`), upload the `.html` and the images zip beside it (or paste the `.html` into any tool once `images/` is uploaded to the `image-base` folder), `email.txt` for the plain-text part, `preview.png` to check light and dark. Say which merge tags passed through, and that a test send to Outlook, Gmail and Apple Mail is the last check;
