# F15: the two-account co-op test

A live test of the platform behavior co-op mode depends on (backlog item F15). It is run by hand with two accounts, not by a test suite.

## Start here

**Runbook:** https://claude.ai/artifact/R3VBV696AnBy8nztch8rCb

It has the setup, the probe prompt with the links filled in, the twelve tests (T0 to T11), and a card per test where both accounts record the result. Results live in the page's database (collection `results`, one document per test). The prompt at the end of the page copies them into the backlog.

## The published test piece

The piece, set up the way Prism sets up a co-op piece. Ian is the owner.

| What | Link |
|---|---|
| Proof doc (Content, Claims, About tabs) | https://claude.ai/artifact/Bv75YXVLzfgue3aXbs5wtM |
| Design canvas (sheet and deck boards, owner note) | https://claude.ai/artifact/BbWh31MrHyRiLe7k8VMkd1 |
| Exports page (the PDF, saved through `downloads`) | https://claude.ai/artifact/YLZd4hFMZQMZtJZpiNw5Qt |

All four are private until Ian shares them.

## Files

- `piece/`: the mock piece (content.md, claims.md, a sheet and a three-slide deck). Every figure and name in it is illustrative.
- `probe.md`: the prompt each watching session gets. The runbook shows it with the links filled in.
- `runbook.html`: the source of the runbook page.

## Settled while building the kit

- Artifacts never host .pptx, .zip, .docx or .xlsx: the publish is refused under any content type. PDF and images are fine.
- A plain download link does nothing in the artifact viewer. The Exports page saves files through the `downloads` capability.

`exports.js` handles both.
