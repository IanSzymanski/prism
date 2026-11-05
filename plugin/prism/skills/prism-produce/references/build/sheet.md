# Building: Sheet, brochure and 5x7 card

The prism-produce skill's build, check and delivery notes for this format (sections 2 and 3); read only for a piece that has it.

## Build

- sheet: `.prism-kit/run.sh sheet formats/sheet.md out/<tag>.pdf`
- brochure: `.prism-kit/run.sh sheet formats/brochure.md out/<tag>.pdf` (the `layout: brochure` front matter switches the builder)
- 5x7: `.prism-kit/run.sh sheet formats/5x7.md out/<tag>.pdf` (`layout: 5x7`; two sides at most, a third stops the build)
- print copy (sheet, brochure, 5x7), only when asked ("print version", "for the office printer", "white background"): the same command with `--print`, to `out/<tag>-print.pdf`, beside the screen copy. It sets the page to plain white and keeps the glow and tinted blocks. Never make a second format file for it, so the two copies can't drift; once asked for, rebuild it with every later export of that format.

## Build warnings

- `[sheet] orphan: ...`: reword that sentence or join its last two words with `\ ` (a `title orphan fixed` or `heading orphan fixed` line is done already: say nothing).
- `[sheet] variety: ...`: show that section's information in another format (components.md, "Variety"); cards in another layout don't count.
- `[sheet] brochure page N, panel N: content runs ... past the panel bottom` or `[sheet] 5x7 front: content runs ... past the bottom edge`: cut words, then an image.

## Visual check

- brochure: exactly two pages, nothing cut off at a panel bottom (panels clip, they don't overflow).
- 5x7: one or two pages, nothing cut off at a side's bottom edge (sides clip like panels).
- page count: a sheet asked for as a one-pager must be one page. Follow "Fitting a one-pager" in the sheet card: compact hero and closing card first, then cut content. Never shrink type or margins any other way. Say what was cut.
