# Prism guided walkthrough: one sample piece, start to finish
<!-- walkthrough-reviewed: 1.2 -->

Run this when someone types `/prism-tutorial` with no topic, or asks to be walked through Prism ("show me how it works", "walk me through it", "guided tutorial"). It makes a real sample piece with the real skills, stage by stage: the prompt and source material, the interview, the draft, the proof in Claude Docs, design mode in Claude Design, the export, and then the same approved words exported again as other formats. At every stage, say **why the stage is there**, **what the person can do in it**, and **how it is shared**, then pause so they can try it before moving on.

Everything in it is real work, done the way the prism-draft and prism-produce skills say. This file only adds the explanations and the pauses; where it says "follow", follow that skill's step exactly. Never invent a feature: everything Prism does is in `tutorial.md` and the skills.

## How to run it

- **The brand.** Use the default brand (`.prism-kit/run.sh brands` marks it) unless the person named another in their request (`/prism-tutorial in the <brand> brand`). Don't ask.
- **The sample.** `.prism-kit/run.sh tutorial <brand> --out <workspace>` sets up the sample piece: the brand's own sample when it has one (a prompt, rough fictional source notes with numbers, monthly figures and quotes, the interview answers, and what to try at each stage), otherwise the kit's neutral one. It prints the project folder, the prompt, the answers (`answer ...`), the tries (`try ...`) and the other formats to show at the end (`more ...`). A second run keeps a piece already set up, so the person can stop and pick up again later (`state <slug> show` says where the canvas stopped).
- **The same every time.** A sample with fixed files (`fixed:` in the `run.sh tutorial` output) gives every run the same draft, the same reviewer flags, the same proof doc and the same design boards: the writer, reviewer and formatters don't run for it. `--out` puts the fixed draft in place as content.md and claims.md, `--approve` puts the fixed approved words in place, and `--format <name>` the fixed layout for a format. Never rewrite, reorder or reword any of it, and never run the agents over it. Only the person's own edits change it, and those go through the usual lanes (a changed word is patched into the fixed layouts, never regenerated). A format without a fixed layout, and a film, is made the usual way: say in one line that it is made fresh, so it can differ between runs. A sample without fixed files runs the agents as usual.
- **Every figure in the sample is illustrative.** The piece is `figures: illustrative`, so every output labels it as fictional. Say so once at the start.
- **Pacing.** Each stage ends with one AskUserQuestion call, header "Tutorial", question "<what just happened, in a few words>. Ready for <next stage>?", with these options:
  1. "Continue to <next stage> (Recommended)"
  2. "Let me try something first": pause. Reply with the standard message and nothing else: one line ("Go ahead: try anything this stage allows, then tell me when you're ready to move on."), then the stage's suggestions from the sample's `try` list for that stage (`try <stage>:` lines), as two or three bullets. Make no tool calls for it: don't re-read the doc, the canvas or their comments, and don't recap or re-answer anything from earlier stages. Then wait for the person. When they do something, handle it the normal way for that stage, read back as usual, and ask the same question again.
  3. "Skip ahead to the other formats": go to stage 7. The proof stop still holds: before approval, ask for "approve" first (stage 4); the sheet is then built without design mode ("just build it").
  4. "End the tutorial": go to "Wrapping up".
- **Show what the AI sees.** The person sees every input at the moment Prism reads it, so they can check each step against it: the full sample message (the prompt and the whole of the notes) in stage 1, the answers in stage 2, and in stage 3 each flag and claim beside the line of the notes it came from. Never summarize an input in place of showing it; a summary goes after it.
- **Sharing, kept simple.** Mention sharing wherever a stage has something to share: who can be invited, that they can edit and review with you, and that you are the one who approves. Never go into how Prism handles shared work behind the scenes (no named modes, comment commands or extra pages); if the person asks, point them to `/prism-tutorial work together`.
- **Every file once.** Each file goes to the person once, in the stage that makes it: the notes in stage 1, each built output when it is exported. Never send the notes, content.md, claims.md, images.md or a format file again. Once the proof doc exists, it is the one place the words are shown and changed: a wording edit at any later stage is made in the doc (and content.md behind it), and the reply says what changed there instead of attaching files.
- **Earlier stages stay closed.** Once the words are approved, the proof doc is the record: its comment threads are settled, so never answer, re-check or report on them again, and never repeat an earlier read-back. Each stage's messages are about that stage only.
- **Leave the brand machinery out.** The tutorial is about making a piece, so never mention how the brand is set up: no design-system changes since the release, new components, drafts, onboarding or brand updates, even when `resolve` or a build prints them (note them in log.md only).
- **Keep each explanation short:** three headed lists (Why it's here, What you can do, Sharing), two to four lines each, in your own words. The person is watching work happen; don't make them read a manual. Every stage keeps its own rules: the proof stop still holds, design mode still builds nothing before "done", and so on.
- **When a tool isn't there**, say what the stage does in the full product, show its file stand-in, and carry on: no Claude Docs tools means the proof is done with content.md and claims.md (prism-draft step 4, without the doc); no Artifact tool means no design canvas, so build straight away ("just build it"); no Claude Motion means the film stops at its brief (`references/film.md` in prism-produce) and the person is told films need Claude Motion (Team and Enterprise plans).

## Stage 1: Welcome and the sample prompt

Do: copy the kit to `.prism-kit` if it is not there (prism-draft step 1), run `.prism-kit/run.sh tutorial <brand> --out <workspace>`, then `.prism-kit/run.sh tutorial <brand> --prompt`, which prints the sample message exactly as a person would send it: the prompt, then the full notes. Send the notes file in the project's `source/` with SendUserFile once, here, so it can be opened beside the later stages; it is never sent again.

Say:

- One line on what Prism is: raw material in, proofed and on-brand files out, with a person approving the words in between.
- The route, as a short numbered list: prompt and material, interview, draft and review, proof in Claude Docs, design mode in Claude Design, export, then other formats from the same words.
- The brand it will use (and that `/prism-tutorial in the <brand> brand` uses another), and that everything in the sample is fictional.
- **The sample prompt, in full:** the whole `--prompt` output, word for word, in one quoted block headed "This is the message Prism receives". Nothing left out or shortened: the prompt line and every line of the notes, tables included. This is exactly what the writer and the reviewer will read in stage 3.
- After it, a three-line summary of the notes (what the organization is, the before and after numbers, the quotes), and one line saying they are rough on purpose, like real call notes: typos, mixed formatting and shorthand, and a few claims that shouldn't go out as written. Don't point those out: invite the person to spot them, then see in stage 3 what the writer cleaned up and what the reviewer flagged.
- What they'd do on their own: paste or attach notes, a transcript, a document or photos, and type a prompt like this one. Audio isn't accepted; a transcript is.

Pause (next: the interview).

## Stage 2: The interview

Do: follow prism-draft step 2 with the sample's answers. Ask the one AskUserQuestion call a real piece would get (audience, length, outputs, images), with each sample answer as the first option marked "(from the sample)" and "Skip for now" on every question. Use what they pick; a skipped question takes the default, exactly as in a real piece. Write `interview.md` as usual. With fixed files the draft stays the fixed one whatever they answer: when an answer differs from the sample's, say in one line what it would change in a real piece (a shorter draft, another output) and that the tutorial keeps its sample so every run matches.

Say:

- **Why it's here:** the writer never guesses who it's for, how long it is or what files are wanted; a few answers up front save a round of rewrites.
- **What you can do:** skip any question and answer it later ("make it shorter", "also a deck"); upload photos now, use the brand's photo library, or add them later; `/prism-interview` asks everything up front instead. The answers stay private to the piece and never appear in a file.

Pause (next: the draft).

## Stage 3: Draft and review

Do: with fixed files, the draft is already in the project: `content.md` and `claims.md` from `run.sh tutorial --out`, its reviewer flags the `<!-- CHECK -->` comments in content.md (the same three, in the order of the proof's `comments`). Don't run the writer or the reviewer; say in one line that the tutorial shows the draft they produce for these notes, so it is the same every time. Without fixed files, follow prism-draft step 3: the prism-writer agent writes `content.md` and `claims.md` from the notes, the prism-reviewer agent flags what needs a look.

Say:

- **Why it's here:** the words are written once, with no layout, so every format later is laid out from the same approved text and no number can drift between them.
- **What you get:** `content.md` (the words: an at-a-glance block, the challenge, what they did, results with the monthly table for a chart, the quotes, the close) and `claims.md` (every number, quote and claim with the line of the notes it came from). Don't send them as files: show the parts this stage talks about in the message, and the whole draft opens in the proof doc in stage 4. Without Claude Docs tools, send content.md and claims.md once, here.
- **What the writer cleaned up:** with fixed files, the sample's `fixed.cleanup` pairs as a short table (the notes as written, quoted exactly; the draft; what kind of fix), from `run.sh tutorial --json`. Say the writer fixes slips like these without asking, but never changes a number, a name, a quote or a claim on its own.
- **Where each claim came from:** a short table of the main claims (each headline number and both quotes): the claim as drafted, then the line of the notes it came from, quoted exactly as stage 1 showed it. The person can trace every number back to the input.
- **The reviewer** flagged what the notes shouldn't carry as written. For each flag, one line: the flagged sentence in the draft, the notes line it came from (quoted), and the reason (for example the unsourced boast, a claim that the AI approves notes on its own, the turnover figure nobody has). It flags; it never rewrites the copy. A notes line that was left out of the draft on purpose (the writer never invents or keeps an unsupported claim) is named too, so the person sees what was dropped and why.

Pause (next: the proof in Claude Docs).

## Stage 4: The proof in Claude Docs

Do: follow prism-draft step 4, "Proof in a Claude Doc": the doc titled "<piece title> · proof" with its Content and Claims tabs, every flag a "Check:" comment, opened for the person. Don't approve on their behalf. With fixed files, make the doc exactly the same every time: its title is `title` in the proof file (`fixed.proof` in `run.sh tutorial --json`); the Content tab is content.md's body, without front matter or CHECK flags, word for word; the Claims tab is claims.md as written; and the comments are the proof file's `comments`, in that order, each on its `anchor` with its `text` exactly. Number the flags in chat in the same order.

Say:

- **Why it's here:** this is the one place the words are approved. Nothing is designed before it, because a layout built on wrong words is wasted work, and every format later inherits exactly what is approved here. Approval is refused while a "Check:" comment is open, unless the person says "keep it as is".
- **What you can do:** type straight into the Content tab like any document; reply to a "Check:" comment or resolve it; read the Claims tab to see where every number came from; or describe changes in chat ("make the opening shorter") and they are applied to the doc. The sample's `try proof` suggestions are good first edits.
- **Sharing:** invite people with Share at the top of the doc (Prism can't share for you). They can edit the words and comment with you, and they don't need Prism. You are the one who approves.
- When the words are right, say **"approve"**.

Pause, with option 1 reading "Approve the draft (Recommended)". When they approve, follow "On approve" in prism-draft step 4: read the doc back, vet the edits, and report what changed and what was fixed. For a flag still open, ask once whether to fix it or keep it as is; with fixed files the first option is "Cut the flagged sentences (Recommended)", the fix each comment suggests. Then say in one line that content.md is now the only source and the doc stays as the record.

With fixed files: when the doc read back is the fixed draft with the flagged sentences cut (the person changed nothing else, or only resolved the comments), install the fixed approved words with `run.sh tutorial <brand> --out <workspace> --approve` instead of writing content.md from the export, so the next stages match every run. When they edited more, approve from the doc as usual and note in log.md what differs from the fixed approved words; stage 5 patches it in.

## Stage 5: Design mode in Claude Design

Do: follow prism-produce sections 0, 1 and 1b for the sheet: the formatter lays out the approved words as a two-page case study (`formats/sheet.md`), then the canvas opens with its board. With fixed files the formatter doesn't run: `run.sh tutorial <brand> --out <workspace> --format sheet` puts the fixed layout in place, so the board is the same every time (the wire command builds it identically from the same file). When the approved words differ from the fixed ones (stage 4), run prism-formatter in patch mode on that file with just those changes, then the number check, before the canvas opens. Never lay the sheet out afresh when a fixed layout exists: that is what made first runs come out at four pages.

Say:

- **Why it's here:** layout decisions (what goes first, what stays, which block is a chart and which a quote) are easiest to make by looking and dragging. The canvas is a plain wireframe, the real words in the real order with the brand's components sketched in grey, so the conversation stays about structure. Its styling is never exported: the files are always built by the kit in the brand's own styles.
- **What you can do:** retype any text or a link's address (in its blue chip); drag a block (or a whole slide or post) into a new order; delete what should go; or ask in chat ("make the results a chart", "use a calendar icon on the second card", "move the quote to page one"). Photos can be added at any point. Every change is read back into the Markdown, vetted and reported. The sample's `try design` suggestions are good first moves.
- **Sharing:** invite people with Share on the canvas. They can rearrange, edit and review the layout with you. You are the one who says "done".
- Nothing is built until **"done"**. Say it when the layout is right.

Pause, with option 1 reading "Say \"done\" and export (Recommended)". A canvas edit or chat request runs the "Design session" loop in prism-produce section 4 before asking again.

## Stage 6: The export

Do: on "done", follow prism-produce section 4 step 7 and sections 2 and 3: pull and vet the canvas, number check, build the sheet, preview, `verify`, deliver with SendUserFile, record the export, and republish the board stamped "Exported v<n> · <date>". With fixed files the sheet must come out as `fixed.expect` says (`run.sh tutorial --json`): two pages, with all four steps of "What they did" on one page. The build prints the page count; check the steps in the preview. If the person's own edits pushed it past that, fit it back before delivering ("Fitting" in the sheet card: cut a supporting sentence first) and say what was cut; never deliver a three- or four-page tutorial sheet, or one with its steps split across pages.

Say:

- **Why it's here:** every file is checked before it reaches anyone: `run.sh check` finds any number that isn't in the approved words, the preview catches layout faults, and `verify` confirms the file was built by the kit with the brand's fonts. A file that fails is never delivered.
- **What you get:** the two-page PDF, named `<slug>-sheet-v<n>.pdf` so rounds never mix; the preview; and a line on what the formatter had to cut. Ask for a "print version" and a plain white copy comes beside it.
- **What changes now:** the canvas matches the file, and from here every change (on the canvas or in chat) is exported again straight away, without another "done". Wording and numbers go into content.md and every output; layout touches only one output. The sample's `try revise` suggestion shows this best once stage 7 has made more than one output.
- **Sharing:** the PDF is the finished file to send. People you invited to the doc or canvas can keep reviewing with you; any change they ask for is exported again once you agree to it.

Pause (next: the same words in other formats).

## Stage 7: The same words, other formats

Do: ask one AskUserQuestion call, multi-select, "Which other formats should the same approved words become?", one option per `more` line the sample printed, with its prompt as the description; the first three options, a PowerPoint deck, a carousel and an animated film, marked "(Recommended)". Four options at most, so keep the deck, carousel and film and offer one of the rest; "Other" covers the remaining ones (social posts and stories, an HTML email, a blog post, a brochure, a 5x7 card, an email header, a one sheet, a website page). Then follow prism-produce "New export later" for each one picked: one prism-formatter per format in create mode, in parallel, from the same content.md. With fixed files, a format with a fixed layout (`fixed layout` on its `more` line: the deck and the carousel) takes it from `run.sh tutorial <brand> --out <workspace> --format <name>` instead of a formatter (patched, as in stage 5, when the words differ), so its board and file are the same every run; the rest are made by the formatter and said to be made fresh.

- The deck, carousel and any other static format get their board added to the same canvas beside the sheet (`references/wireframe.md`, "A format added later"). Since the piece is already exported, each one is built, checked, verified and delivered straight away (section 4, Design session step 8), and its board is stamped.
- An animated film never opens on the canvas: follow prism-produce `references/film.md` (the direction script, the film in Claude Motion, `motion check`, stills); the film's own page is where it's reviewed, and **Export** there saves the MP4.
- A website illustration (an animated UI mockup of one feature for the brand's website) never opens on the canvas either: `run.sh illustration` builds the HTML block for the site and a bench page, and the bench, published as an Artifact, is where it's reviewed, playing live.

Say, per format, one or two lines:

- **Deck:** an editable 16:9 PowerPoint with native charts; the monthly figures become a real chart that can be edited. The brand's Office fonts come as a pack with the first deck; they need to be installed to present.
- **Carousel:** PNG panels and a caption file for posting; the cover comes first and the closing panel last.
- **Animated film:** the same results as a short film in the brand's colours, fonts and logo, each scene held long enough to read. Comments on its page pin to a moment; Export saves the MP4.
- **Website page:** the same words as a whole page for the brand's site, sections alternating sides, as block markup to paste into a new WordPress draft, with its search fields and photo slots in a page file. Its board joins the canvas like the others; the draft on the site is the real preview.
- **Any other format:** what the plugin README's outputs table says it is.
- **Sharing:** the new boards sit on the same canvas, so anyone already invited can review them with you; a film's page can be shared the same way for comments. You approve every change.

Then make the point of the whole tutorial, in two lines: nothing was rewritten. Every output was laid out from the one approved content.md, and every number in each of them passed the same check against it.

Then show a revision: offer the sample's `try revise` suggestion. If they take it, follow the content lane (prism-produce section 4): content.md, the reviewer for the changed number, patched into every format file without regenerating them, re-exported, read back with each output that changed. Then contrast it with a layout change ("make the deck's results slide a stat slide"), which touches only that output.

Pause, with option 1 reading "Finish the tutorial (Recommended)" and option 3 reading "Try another format".

## Wrapping up

Say:

- What was made, as a short table: each output, its file, and where it lives (the proof doc, the canvas, the film page, the files sent).
- **Packages** do all of this at once: "draft this into a case study package" makes a set of outputs from one proof (`.prism-kit/run.sh packages` lists them).
- **Quick mode** skips the interview and the proof for one fast file ("quick one-pager from these notes"); its claims are listed to check afterwards.
- The sample piece is fictional and can be deleted; its proof doc, canvas and film page are private until you share them. Anyone you invite can edit and review with you, and you are always the one who approves.
- `/prism-tutorial <topic>` gives the rundown of one part (for example `/prism-tutorial packages`), and `/prism-tutorial rundown` the whole overview.
- End with one next step that fits: "Paste your own notes and say 'draft this into a case study'."
