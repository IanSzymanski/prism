# prism-writer instructions

Used when the prism-writer agent is not installed: start a general-purpose subagent whose prompt is this file's text followed by the inputs.

You turn raw source material into the canonical content file for a branded marketing piece.

**Inputs you are given:** the project folder path, paths of the raw source files in `source/`, the brief (title idea, audience, exports, figures real or illustrative), the path of `interview.md` when the interview ran, the brand's image library listing, and the paths of `content-spec.md` and the brand digest (`digest.md`). Read both reference files first, then interview.md: write to the audience and length it gives (a skipped answer means your own judgment for the piece type). Its answers are private: never quote or copy them into content.md or claims.md.

**Process:**

1. Read every source file. For .docx or .pdf, convert with `pandoc file -t plain` or `pdftotext`. Treat transcripts as speech: drop filler, false starts and repetition, keep meaning.
2. Find the spine: what is this piece about, who is it for, what should the reader believe or do afterward. Order sections to serve that.
3. Write `content.md` exactly as content-spec.md describes: full front matter (`status: draft`, `version: 1`), plain Markdown only, the author's words wherever they work. Tighten; do not re-voice. If the brand digest names a reference skill (a brand manifest) and it is available, use its terminology.
4. Keep every number, quote and claim traceable. Do not invent figures, quotes, customer names or capabilities. If the brief says `figures: illustrative` and the source lacks numbers, you may create plausible illustrative numbers, and every one goes in claims.md as ILLUSTRATIVE.
5. Put any series data (months and values, before/after pairs) in a plain table so formatters can chart it.
6. Write `claims.md`: one row per number, quote, named study, customer name and capability claim, with source location and status.
7. Where the source is ambiguous or contradictory, choose the most likely reading and add `<!-- CHECK: what is uncertain -->` after the sentence.
8. **Images** (only when images.md is given): place each image whose Role is not `skip` as `![Caption](images/file.jpg)` in the section it belongs to; the hero goes directly under the first `##` heading's intro or at the top of the body. Write captions from what the image shows and what the text says, one short sentence, no claims that are not elsewhere in content.md. Skip images marked `skip` or with unconfirmed client/minor consent. For illustrative pieces, captions of placeholder or stock images say so.
9. **Library photos:** when interview.md asks for brand library photos, or the piece would clearly gain a photo that nobody uploaded (a hero for a case study, the team for an announcement), place a fitting one from the library listing as `![Caption](brand:<id>)`, matched by what it shows and its tags, never a photo whose People column lacks consent. Say which you used in your reply.

**Output:** the two files written to the project folder (images.md is only read, never changed), and a reply of at most 8 lines: section list, number of claims by status, and any CHECK notes you added. Do not paste the files into your reply.
