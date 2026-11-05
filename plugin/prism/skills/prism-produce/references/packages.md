# Packages

Read when content.md names a `package:`. Each part belongs to the prism-produce step it names.

## Preflight (section 0, step 6)

**Package** (content.md names a `package:`): the outputs are the ones in `<slug>/package.json`. Each output is its own format file, `formats/<output id>.md`, laid out with its `format`'s card, so two outputs of one format (a one-pager and the full case study PDF, both sheets) never share a file. A change to the set ("no deck", "three posts", "add a carousel") is `.prism-kit/run.sh packages use <slug> <package>` with `--drop`, `--set` or `--add`, which changes the piece's package.json and keeps its earlier changes; then content.md's `exports` line.

## Format (section 1)

- **Package outputs:** the format name is the output's `format`, the target is `formats/<output id>.md`, and each formatter also gets that output's brief and counts from package.json. When every format file is written, `.prism-kit/run.sh packages check <slug>` must print OK (every file there, the right number of posts and stories, email and brochure layouts) before anything opens or builds; fix what it lists in that format file.

## Build (section 2, step 2)

- package outputs: the command for the output's format, with `formats/<output id>.md`, and folder builds into `out/<output id>` (`.prism-kit/run.sh social formats/story.md out/story`), so outputs of one format never share a folder.

## Check (section 2, step 6)

**Package:** `.prism-kit/run.sh packages check <slug> --built` (every output built, page counts as the package asks: a one-pager on one page, a multipage PDF on at least its pages) and `.prism-kit/run.sh packages claims <slug>` (no output claims what content.md doesn't) must both print OK. Fix and rebuild what they list; a claim still open from "Packages: edit each output freely, flag claims" (Revise, below) waits for the person's answer.

## Deliver (section 3)

- **A package goes out as one zip.** Once every output is verified, `.prism-kit/run.sh packages zip <slug>` writes `out/<slug>-<package>-v<version>.zip`: a folder per output with its files (captions files, the email's HTML, text, images and images zip, the blog's post and header), the deck's font pack when one was made (make it first, below), and `CONTENTS.txt`. Deliver that zip and the preview contact sheets, not the files one by one; every later export is a new zip at the new version. When the set was a one-off (`from: this piece` in package.json) or the person changed a package, offer once to save it as a package for everyone (the prism-onboard skill, "A package"). The rest of this section (each file's job, revisions) applies to the files inside it.

## Revise (section 4)

**Packages: edit each output freely, flag claims.** In a package each output can be edited on its own (rewording, cuts, a shorter headline, layout), in design mode or in chat, and the edit stays in that output: it is not carried into content.md or the other outputs, and you don't ask whether it should be. The one exception is a claim. After every edit to an output, run `.prism-kit/run.sh packages claims <slug>` and read the changed passages against claims.md:

1. **A changed number** (a number the output states that content.md doesn't) or **a new claim** (a quote, capability, customer name or result that isn't in claims.md) is flagged. List it under "Needs your call" with the output and the passage, and offer two answers: make it the approved claim (content lane: content.md and claims.md, the reviewer, then patched into every output that carries it, which the claims table lists), or keep the approved one in this output.
2. The flagged output isn't exported until the person answers; the other outputs carry on.
3. Cuts are never flagged: a story carries one result, the PDF all of them.
4. "Do the same in the others" applies a layout or wording edit to every output where it fits.
