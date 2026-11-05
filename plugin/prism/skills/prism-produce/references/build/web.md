# Building: Website page

The prism-produce skill's build, check and delivery notes for this format (sections 2 and 3); read only for a piece that has it.

## Build

- web: `.prism-kit/run.sh web formats/web.md out/web` (`<tag>-blocks.html`, the page's block markup for the site; `<tag>-page.json`, its template, search fields and image slots; `images/`, the piece's photos to upload). It prints `[web]` warnings and errors (the card lists them); fix each in the format file and rebuild. It lists every image slot and whether it has a photo to upload. A website page has no preview image: its layout was reviewed in design mode, and the draft on the site is the true preview.

## Deliver: what each file is for

- website page: `<tag>-blocks.html` is the page to paste into a new draft's Code editor (Options ⋮ > Code editor); `<tag>-page.json` holds its template and page settings, search title, description, keyphrase and image slots; `images/` are the photos to upload, one per slot (each slot's alt text starts with its name). Say which slots still need a photo. Never publish: the page stays a draft until people approve it. A site bridge or connector creates the draft only when the brand digest says it is ready;
