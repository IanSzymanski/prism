# Website page fixtures (Case Amplify's site kit)

`tests/web.test.js` uses these. They name the brand, so they live here rather than in `fixtures/`.

| File | What |
|---|---|
| `vocational-rehabilitation.original.html` | Ground truth: the block markup the WordPress editor saved for caseamplify.com/vocational-rehabilitation/ (page 4246). When a site-kit block is added or changed, capture a real example from the editor's Code editor first, then match it |
| `vocational-rehabilitation.md` | That page as a Prism web format file. Its FAQ heading is pinned `{.left}`: the live page breaks the alternation there |
| `caseworker-burnout.blocks.html` | The markup ca-web built for the first new page, which Ian pasted into the editor and confirmed (the blocks stayed editable). `fixtures/web.md` must rebuild it byte for byte |

Both pages were converted from ca-web's `web.md` syntax with its own parser, and rebuild byte for byte what ca-web built from the originals.

## The VR round trip: 201 blocks, 20 intentional differences

`run.sh web compare vocational-rehabilitation.original.html <built>` ignores block ids and whitespace. The original and the build have the same 201 blocks; 181 match exactly. The other 20 differ only where the site kit writes a consistent version on purpose:

- **Accent words:** the h1 and the FAQ heading used an inline-colour `<mark>`. They now use `kt-highlight` with `markColor: palette3`, like every other heading.
- **FAQ heading row:** it had come unlinked from the `ca-header/divider` pattern. It's relinked.
- **Leftover line breaks:** a paragraph starting with `<br>`, two lists ending in `<br>`, and "Yes." answers written as `<strong>Yes.<br></strong>` are cleaned up.
- **FAQ panes:** renumbered 1 to 9 (they were 1, 7, 2, 12, 13, 9, 10, 14, 11), and `paneCount` is 9 instead of 14.
- **Unused settings removed:** the band's fifth card had `direction` and `justifyContent` set when the others didn't, and one FAQ answer had an empty `fontHeight`.

If the count changes, either the change is intended (update the test and this list with the reason) or it's a regression.
