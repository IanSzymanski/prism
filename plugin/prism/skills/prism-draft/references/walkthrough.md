# Prism guided walkthrough: one sample piece, start to finish
<!-- walkthrough-reviewed: 0.16 -->

Run this when someone types `/prism-tutorial` with no topic, or asks to be walked through Prism ("show me how it works", "walk me through it", "guided tutorial"). It makes a real sample piece with the real skills, stage by stage: the prompt and source material, the interview, the draft, the proof in Claude Docs, design mode in Claude Design, the export, and then the same approved words exported again as other formats. At every stage, say **why the stage is there**, **what the person can do in it**, and **how it is shared**, then pause so they can try it before moving on.

Everything in it is real work, done the way the prism-draft and prism-produce skills say. This file only adds the explanations and the pauses; where it says "follow", follow that skill's step exactly. Never invent a feature: everything Prism does is in `tutorial.md` and the skills.

## How to run it

- **The brand.** Use the default brand (`.prism-kit/run.sh brands` marks it) unless the person named another in their request (`/prism-tutorial in the <brand> brand`). Don't ask.
- **The sample.** `.prism-kit/run.sh tutorial <brand> --out <workspace>` sets up the sample piece: the brand's own sample when it has one (a prompt, fictional source notes with numbers and a results table, the interview answers, and what to try at each stage), otherwise the kit's neutral one. It prints the project folder, the prompt, the answers (`answer ...`), the tries (`try ...`) and the other formats to show at the end (`more ...`). A second run keeps a piece already set up, so the person can stop and pick up again later (`state <slug> show` says where the canvas stopped).
- **Every figure in the sample is illustrative.** The piece is `figures: illustrative`, so every output labels it as fictional. Say so once at the start.
- **Pacing.** Each stage ends with one AskUserQuestion call, header "Tutorial", question "<what just happened, in a few words>. Ready for <next stage>?", with these options:
  1. "Continue to <next stage> (Recommended)"
  2. "Let me try something first": they try the stage's `try` line, or anything else the stage allows. Do it the normal way, read back as usual, then ask the same question again.
  3. "Skip ahead to the other formats": go to stage 7. The proof stop still holds: before approval, ask for "approve" first (stage 4); the sheet is then built without design mode ("just build it").
  4. "End the tutorial": go to "Wrapping up".
- **Show what the AI sees.** The person sees every input at the moment Prism reads it, so they can check each step against it: the full sample message (the prompt and the whole of the notes) in stage 1, the answers in stage 2, and in stage 3 each flag and claim beside the line of the notes it came from. Never summarize an input in place of showing it; a summary goes after it.
- **Keep each explanation short:** three headed lists (Why it's here, What you can do, Sharing), two to four lines each, in your own words. The person is watching work happen; don't make them read a manual. Every stage keeps its own rules: the proof stop still holds, design mode still builds nothing before "done", and so on.
- **When a tool isn't there**, say what the stage does in the full product, show its file stand-in, and carry on: no Claude Docs tools means the proof is done with content.md and claims.md (prism-draft step 4, without the doc); no Artifact tool means no design canvas, so build straight away ("just build it"); no Claude Motion means the film stops at its brief (`references/film.md` in prism-produce) and the person is told films need Claude Motion (Team and Enterprise plans).

## Stage 1: Welcome and the sample prompt

Do: copy the kit to `.prism-kit` if it is not there (prism-draft step 1), run `.prism-kit/run.sh tutorial <brand> --out <workspace>`, then `.prism-kit/run.sh tutorial <brand> --prompt`, which prints the sample message exactly as a person would send it: the prompt, then the full notes. Send the notes file in the project's `source/` with SendUserFile too, so it can be opened beside the later stages.

Say:

- One line on what Prism is: raw material in, proofed and on-brand files out, with a person approving the words in between.
- The route, as a short numbered list: prompt and material, interview, draft and review, proof in Claude Docs, design mode in Claude Design, export, then other formats from the same words.
- The brand it will use (and that `/prism-tutorial in the <brand> brand` uses another), and that everything in the sample is fictional.
- **The sample prompt, in full:** the whole `--prompt` output, word for word, in one quoted block headed "This is the message Prism receives". Nothing left out or shortened: the prompt line and every line of the notes, tables included. This is exactly what the writer and the reviewer will read in stage 3.
- After it, a three-line summary of the notes (what the organization is, the before and after numbers, the quotes), then the lines in the notes that should not survive as written (an unsourced boast, a claim nobody checked, a figure nobody has), each quoted exactly as it appears above: the reviewer is about to catch them, and the person can check it did.
- What they'd do on their own: paste or attach notes, a transcript, a document or photos, and type a prompt like this one. Audio isn't accepted; a transcript is.

Pause (next: the interview).

## Stage 2: The interview

Do: follow prism-draft step 2 with the sample's answers. Ask the one AskUserQuestion call a real piece would get (audience, length, outputs, images), with each sample answer as the first option marked "(from the sample)" and "Skip for now" on every question. Use what they pick; a skipped question takes the default, exactly as in a real piece. Write `interview.md` as usual.

Say:

- **Why it's here:** the writer never guesses who it's for, how long it is or what files are wanted; a few answers up front save a round of rewrites.
- **What you can do:** skip any question and answer it later ("make it shorter", "also a deck"); upload photos now, use the brand's photo library, or add them later; `/prism-interview` asks everything up front instead. The answers stay private to the piece and never appear in a file.

Pause (next: the draft).

## Stage 3: Draft and review

Do: follow prism-draft step 3: the prism-writer agent writes `content.md` and `claims.md` from the notes, the prism-reviewer agent flags what needs a look.

Say:

- **Why it's here:** the words are written once, with no layout, so every format later is laid out from the same approved text and no number can drift between them.
- **What you get:** `content.md` (the words: an at-a-glance block, the challenge, what they did, results with the monthly table for a chart, the quotes, the close) and `claims.md` (every number, quote and claim with the line of the notes it came from). Send both with SendUserFile.
- **Where each claim came from:** a short table of the main claims (each headline number and both quotes): the claim as drafted, then the line of the notes it came from, quoted exactly as stage 1 showed it. The person can trace every number back to the input.
- **The reviewer** flagged what the notes shouldn't carry as written. For each flag, one line: the flagged sentence in the draft, the notes line it came from (quoted), and the reason (for example the unsourced boast, an unapproved compliance claim, the turnover figure nobody has). It flags; it never rewrites the copy. A notes line that was left out of the draft on purpose (the writer never invents or keeps an unsupported claim) is named too, so the person sees what was dropped and why.

Pause (next: the proof in Claude Docs).

## Stage 4: The proof in Claude Docs

Do: follow prism-draft step 4, "Proof in a Claude Doc": the doc titled "<piece title> · proof" with its Content and Claims tabs, every flag a "Check:" comment, opened for the person. Don't approve on their behalf.

Say:

- **Why it's here:** this is the one place the words are approved. Nothing is designed before it, because a layout built on wrong words is wasted work, and every format later inherits exactly what is approved here. Approval is refused while a "Check:" comment is open, unless the person says "keep it as is".
- **What you can do:** type straight into the Content tab like any document; reply to a "Check:" comment or resolve it; read the Claims tab to see where every number came from; or describe changes in chat ("make the opening shorter") and they are applied to the doc. The sample's `try proof` line is a good first edit.
- **Sharing:** Share at the top of the doc adds a teammate as Editor (Prism can't share for you). Say "work on this with @<name>" and co-op mode starts (prism-produce `references/coop.md`): they edit or leave comments starting **@claude**, your Prism applies and answers them, and only you approve. Teammates don't need Prism.
- When the words are right, say **"approve"**.

Pause, with option 1 reading "Approve the draft (Recommended)". When they approve, follow "On approve" in prism-draft step 4: read the doc back, vet the edits, and report what changed and what was fixed. For a flag still open, ask once whether to fix it or keep it as is. Then say in one line that content.md is now the only source and the doc stays as the record.

## Stage 5: Design mode in Claude Design

Do: follow prism-produce sections 0, 1 and 1b for the sheet: the formatter lays out the approved words as a two-page case study (`formats/sheet.md`), then the canvas opens with its board.

Say:

- **Why it's here:** layout decisions (what goes first, what stays, which block is a chart and which a quote) are easiest to make by looking and dragging. The canvas is a plain wireframe, the real words in the real order with the brand's components sketched in grey, so the conversation stays about structure. Its styling is never exported: the files are always built by the kit in the brand's own styles.
- **What you can do:** retype any text or a link's address (in its blue chip); drag a block (or a whole slide or post) into a new order; delete what should go; or ask in chat ("make the results a chart", "use a calendar icon on the second card", "move the quote to page one"). Photos can be added at any point. Every change is read back into the Markdown, vetted and reported. The sample's `try design` line is a good first move.
- **Sharing:** Share on the canvas adds teammates as Editors; in co-op mode their **@claude** comments are applied the same way, and only you say "done".
- Nothing is built until **"done"**. Say it when the layout is right.

Pause, with option 1 reading "Say \"done\" and export (Recommended)". A canvas edit or chat request runs the "Design session" loop in prism-produce section 4 before asking again.

## Stage 6: The export

Do: on "done", follow prism-produce section 4 step 7 and sections 2 and 3: pull and vet the canvas, number check, build the sheet, preview, `verify`, deliver with SendUserFile, record the export, and republish the board stamped "Exported v<n> · <date>".

Say:

- **Why it's here:** every file is checked before it reaches anyone: `run.sh check` finds any number that isn't in the approved words, the preview catches layout faults, and `verify` confirms the file was built by the kit with the brand's fonts. A file that fails is never delivered.
- **What you get:** the two-page PDF, named `<slug>-sheet-v<n>.pdf` so rounds never mix; the preview; and a line on what the formatter had to cut. Ask for a "print version" and a plain white copy comes beside it.
- **What changes now:** the canvas matches the file, and from here every change (on the canvas or in chat) is exported again straight away, without another "done". Wording and numbers go into content.md and every output; layout touches only one output. The sample's `try revise` line shows this best once stage 7 has made more than one output.
- **Sharing:** the PDF is the deliverable to send. In co-op mode every export also goes on an Exports page teammates can open.

Pause (next: the same words in other formats).

## Stage 7: The same words, other formats

Do: ask one AskUserQuestion call, multi-select, "Which other formats should the same approved words become?", one option per `more` line the sample printed, with its prompt as the description; the first three options, a PowerPoint deck, a carousel and an animated film, marked "(Recommended)". Four options at most, so keep the deck, carousel and film and offer one of the rest; "Other" covers the remaining ones (social posts and stories, an HTML email, a blog post, a brochure, a 5x7 card, an email header, a one sheet). Then follow prism-produce "New export later" for each one picked: one prism-formatter per format in create mode, in parallel, from the same content.md.

- The deck, carousel and any other static format get their board added to the same canvas beside the sheet (`references/wireframe.md`, "A format added later"). Since the piece is already exported, each one is built, checked, verified and delivered straight away (section 4, Design session step 8), and its board is stamped.
- An animated film never opens on the canvas: follow prism-produce `references/film.md` (the direction script, the film in Claude Motion, `motion check`, stills); the film's own page is where it's reviewed, and **Export** there saves the MP4.

Say, per format, one or two lines:

- **Deck:** an editable 16:9 PowerPoint with native charts; the results table becomes a real chart that can be edited. The brand's Office fonts come as a pack with the first deck; they need to be installed to present.
- **Carousel:** PNG panels and a caption file for posting; the cover comes first and the closing panel last.
- **Animated film:** the same results as a short film in the brand's colours, fonts and logo, each scene held long enough to read. Comments on its page pin to a moment; Export saves the MP4.
- **Any other format:** what the plugin README's outputs table says it is.

Then make the point of the whole tutorial, in two lines: nothing was rewritten. Every output was laid out from the one approved content.md, and every number in each of them passed the same check against it.

Then show a revision: offer the sample's `try revise` line. If they take it, follow the content lane (prism-produce section 4): content.md, the reviewer for the changed number, patched into every format file without regenerating them, re-exported, read back with each output that changed. Then contrast it with a layout change ("make the deck's results slide a stat slide"), which touches only that output.

Pause, with option 1 reading "Finish the tutorial (Recommended)" and option 3 reading "Try another format".

## Wrapping up

Say:

- What was made, as a short table: each output, its file, and where it lives (the proof doc, the canvas, the film page, the files sent).
- **Packages** do all of this at once: "draft this into a case study package" makes a set of outputs from one proof (`.prism-kit/run.sh packages` lists them).
- **Quick mode** skips the interview and the proof for one fast file ("quick one-pager from these notes"); its claims are listed to check afterwards.
- The sample piece is fictional and can be deleted; its proof doc and canvas are private until shared.
- `/prism-tutorial <topic>` gives the rundown of one part (for example `/prism-tutorial packages`), and `/prism-tutorial rundown` the whole overview.
- End with one next step that fits: "Paste your own notes and say 'draft this into a case study'."
