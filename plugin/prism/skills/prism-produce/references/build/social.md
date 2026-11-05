# Building: Social posts, stories, carousels and email headers

The prism-produce skill's build, check and delivery notes for this format (sections 2 and 3); read only for a piece that has it.

## Build

- social / email / carousel: `.prism-kit/run.sh social formats/<format>.md out/<format>` (`<tag>-<id>.png` plus `<tag>-captions.md`). It exits with an error and prints `[social] missing caption: <id>` when a post has no caption; fix the format file and rebuild. Read captions.md once before delivering.

## Build warnings

- `[social] story <id>: ... outside the safe area` or `runs into the logo`: shorten that text. For stories, build with `--guides` and look at `_guides/` in the visual check.
