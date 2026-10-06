---
name: prism-draft
description: >
  Use to start any branded content piece from raw material (notes, a transcript, a document, pasted
  text, photos): "draft this", "turn this into a case study / blog post / one sheet / flyer / brochure / deck / posts",
  "make something from these notes", "interview me first", "ask me everything up front". Also handles proofing: "approve the draft", "looks good",
  "here are my edits", or an edited content.md uploaded before anything has been produced. Also answers "how do I use Prism",
  "tutorial", "what can you do" with the rundown in references/tutorial.md.
metadata:
  version: "0.16.0-dev"
---

# Draft: raw material to an approved content.md

Asked how to use Prism ("how does this work", "tutorial", "what can you do"): give the rundown in `references/tutorial.md` and stop; don't start a piece until they bring material.

If the user wants a finished document right away with no proofing first ("quick", "fast", "just make it"), use the prism-quick skill instead.

This skill never builds files. Designed outputs are built only by prism-produce or prism-quick, with the brand kit.

This is steps 1–4 of the content process. It ends at a human proofing stop. Formatting and building happen in the `prism-produce` skill, never here.

References (read before starting): `references/content-spec.md` and the brand's rules, its `digest` from `.prism-kit/run.sh brands --json` (`<brand>` from the request or content.md `brand:`, else the default brand; `.prism-kit/run.sh brands` lists the brands and marks the default, with its default audience).

## Running the subagents

Use the named agent (prism-writer, prism-reviewer, prism-formatter) when it is installed. If it is not (this skill was installed on its own, without the plugin), start a general-purpose subagent instead, with the full text of `references/agents/<agent>.md` as the start of its prompt, followed by the inputs listed below. The instructions are identical either way.

## 1. Set up the project

- Work in the session workspace. Create `<slug>/` (short kebab-case name from the topic) with `source/`, `formats/`, `out/`.
- Save every raw input unchanged into `source/`: uploaded files by copy, pasted text as `source/pasted-<n>.md`, transcripts as-is. Audio is not accepted; ask for a transcript (phone dictation, Teams/Zoom/Otter transcript) if audio is all there is.
- Copy `../prism-produce/kit` to `<workspace>/.prism-kit` if it is not there yet (the image and library commands below use it).
- Start `log.md` with the date, the inputs, and the brief.

### Images

When the upload includes images (JPG, PNG, WebP, HEIC), now or at any later point (the same steps, then "Answers given later" in step 2):

Uploads belong to this piece and this conversation; they are not kept for other pieces. A photo worth reusing (the team, the office, the product) belongs in the brand's design system, in its photo library, so any piece can use it: when one looks reusable, say so once.

1. Keep the originals in `source/`. Normalise copies into `images/` with the kit: `bash .prism-kit/run.sh images <slug>/images <image files>`. It fixes phone rotation, converts colour, and prints a table of pixels, orientation, how large each can print, and its focal point (the spot every layout keeps in frame when it crops; stored in `images/.focus.json`). HEIC may fail to open; ask for JPG or PNG then.
2. Look at every image with the Read tool. Note what it shows, whether identifiable people are in it (and whether they look like staff, clients or children), any text in the image, and anything that makes it unusable (blur, screenshots of private data, other organisations' branding).
3. Write `images.md` as described in `references/content-spec.md`: the kit's columns plus Shows, People and a proposed Role. If the focal point misses what matters (a face at the edge, a sign), correct it in images.md's Focus column and in `images/.focus.json`. Propose one hero only if a landscape image prints at 6.5 in or wider and suits the opening.

## 2. Interview (optional)

A short interview sets the piece up before anything is drafted. Every question can be skipped, and every answer can be given or changed later ("make it shorter", "add these photos", "also a deck"): nothing waits on it, and a skipped answer never blocks the draft.

Skip the whole interview, and use the defaults below, when the person says "skip the questions" or "just draft it", when the request already answers everything, or when the session is unattended. Quick mode (prism-quick) never runs it.

Ask only for what the request doesn't already say, in one AskUserQuestion call. Every question offers "Skip for now":

1. **Audience**: who reads it.
2. **Length**: short (one page, a few posts), standard, or long (several pages), or a word count. Skipped: what suits the piece type.
3. **Outputs**: any of sheet, brochure, deck, social, email (header images), html-email (the whole email: newsletter, announcement or letter), carousel, blog. Skipped: decided after approval.
4. **Images**: "Do you have photos or images for this piece?" Options: "I'll upload them now", "Use photos from the brand library" (only when `bash .prism-kit/run.sh library <brand>` lists any), "Add them later", "No images". Uploads are taken as soon as they arrive (step 1, Images); "later" can be any time, design mode included.

Ask in a second call only what is still unclear and matters: **figures**, real (from sources) or illustrative (fictional example), and the **piece type** when it isn't obvious (case study, one-pager, brief, announcement, guide, blog post). For a blog post also establish its blog type (educational, insights, features, spontaneous, impact, changelog) and author, and ask whether they have a header photo to upload (faded into a brand gradient) or, for features, a product screenshot. Without one the header is a brand gradient. A changelog is its own series: ask for its release line ("Release 2.4 · September 2026"). Record them in content.md front matter as `blog-type`, `author`, `role`, `tags`.

When images are uploaded, ask about them in the next AskUserQuestion call (four questions at most; any overflow in another call):

- **Hero**: "Which image should lead the piece?" Options: the landscape images that print at 6.5 in or wider, by a short description, plus "No hero image". Skip when there is no candidate.
- **Use**: "Which images should go in?" (multi-select), when there are more than three or some look weak. Mention low resolution in the option descriptions.
- **People and permission**: when any image shows identifiable people: "The photos of [short description] show people. Who are they, and do we have permission to use them?" Options such as "Our staff, with permission", "Clients, with signed consent", "Stock or licensed", "Not sure, leave them out". Clients or minors without confirmed consent are left out.
- **Captions**: only if the images' context is unclear from the text: "What should the caption say for [image]?" Otherwise the writer drafts captions and they are proofed with the rest.

Record the image answers in images.md (Role, People columns).

**Keep the answers private.** Write them to `<slug>/interview.md`: the date, each question, and the answer or "skipped". It is working material for this piece, not content: never send it to the person as a file, never put it in the proof, a design canvas, a built file or any connector, and never copy it into log.md (log only "interview: done, 2 skipped"). content.md front matter carries only its usual keys (`audience`, `exports`, `figures`), filled from the answers.

**Defaults** for anything skipped or unattended: the brand's default audience (`run.sh brands`), length to suit the piece type, exports "sheet", figures "real". Note each assumed default in log.md (the default, never the person's own answers).

### Full interview

When the person asks to be interviewed first ("interview me", "ask me everything up front"), ask every question up front instead of only the missing ones, before anything is drafted. Ask questions the request already seems to answer too, with that answer as the first option, marked "(from your request)", so the whole brief is confirmed in one go. Every question still offers "Skip for now". Ask in AskUserQuestion calls of up to four questions, one call straight after another:

1. **Audience**, **Length**, **Outputs**, **Images** (as above).
2. **Figures** (real or illustrative), **Piece type**, **Brand** (only when more than one brand is listed by `.prism-kit/run.sh brands`, drafts included, recorded as `brand:` in content.md front matter), and **Material**: "What should it be built from?" Options: "I'll paste or upload it now", "It's already in this chat". The writer never invents facts, so a piece needs source material; without any, say so and wait for it.
3. Only for a blog post: blog type, author, header photo or screenshot, and for a changelog its release line.

Then wait for anything promised "now" (material, images). When images arrive, ask the image questions (hero, use, people and permission, captions) in one more call. Record interview.md as usual, then continue at step 3 with no further questions.

<!-- claude-only -->
The `/prism-interview` command starts a piece this way.
<!-- /claude-only -->

**Answers given later** go where they belong: before approval, the writer revises the draft (length, audience) or the images join images.md and the draft; after approval, through the prism-produce lanes (a new output is a new export, a new photo is "New images later"). Update interview.md.

## 3. Write and review (subagents)

1. Run the **prism-writer** agent. Pass: project path, source file paths, the brief, the paths of interview.md (when the interview ran) and images.md (when there are images), the output of `bash .prism-kit/run.sh library <brand>`, and absolute paths of `references/content-spec.md` and the brand digest. It writes `content.md` and `claims.md`.
2. Run the **prism-reviewer** agent on the result. Pass: paths of content.md, claims.md, images.md (if any), the brand digest, and the source files. It adds `<!-- CHECK -->` flags inline.
3. Read content.md yourself once. Confirm front matter is complete and no layout markup crept in.

## 4. Proofing stop

The person reviews and approves the words before anything is formatted. Quick mode skips this stop.

<!-- claude-only -->
### Proof in a Claude Doc

When the Claude Docs tools are available, the proof happens in a doc, where the person can edit the words directly. If a docs skill is listed, load it before the first docs call.

1. **Create the doc**, titled "<piece title> · proof", with two tabs:
   - **Content**: content.md's body as Markdown, without the front matter (it stays in content.md). Write each image as its own paragraph, `[Image: images/<file>] <caption>`, so the caption is proofed like any sentence. Leave out every `<!-- CHECK: ... -->` flag; each becomes a comment instead (next point).
   - **Claims**: claims.md's table, as written.
2. **Flags become comments.** For every reviewer flag, comment on the flagged sentence (3 to 6 of its words as the anchor), starting "Check:" and giving the reason. Number them in the same order as in your message.
3. **Open the doc** (the Artifact tool's open action with the doc's link) and record the link in log.md. Send images.md with SendUserFile when there are images.
4. **Message**, short: what the piece is and its sections; the flags, numbered, most serious first, and every claims row marked VERIFY; how to proof: edit the words in the doc, reply in a comment, or describe changes in chat; say "approve" when the words are right.
5. **While proofing, the doc is the draft.** Apply changes asked for in chat to the doc, not to content.md, so the two never drift apart. Read the doc's changes since your last read before every edit.
6. **On "approve"**, read the doc back before approving:
   1. Export the Content tab as Markdown. Keep the current content.md as `content.v<n>.md`, then write content.md as its front matter plus the exported body. Turn each `[Image: images/<file>] <caption>` paragraph back into `![<caption>](images/<file>)`.
   2. Each "Check:" comment still unresolved and unanswered goes back in as a `<!-- CHECK: reason -->` flag after its sentence; a resolved one, or one the person answered, is settled: record how in log.md.
   3. Vet the person's edits: `bash .prism-kit/run.sh vet content.md --was content.v<n>.md --fix`, then proofread every `CHANGED` passage ("Vet every edit" in the prism-produce skill). Fix typos and mechanical slips and list them; a changed number, name, quote or claim goes to the reviewer (below) and is confirmed with the person, never changed silently.
   4. Read the Claims tab back into claims.md, if it changed.
   5. Continue with **Approve** below. After approval content.md is the only source: later changes go through prism-produce, and the doc stays as the record of the proof. Say so in one line.

When the Claude Docs tools are not available, proof with files and chat instead:
<!-- /claude-only -->

Send `content.md` and `claims.md` (and `images.md` when there are images) to the user with SendUserFile. Then write a short message:

- one line on what the piece is and its sections;
- the reviewer's flags, numbered, most serious first, and every claims.md row marked VERIFY;
- how to proof: reply with changes in chat, or edit content.md and upload it; say "approve" when the words are right.

Stop. Do not format or build anything until the user approves.

## Handling the proof

- **Edits in chat:** apply them to content.md with Edit (to the proof doc instead, while one is open). Resolve a CHECK flag only when the edit addresses it. Re-run prism-reviewer on the changed sections only if numbers, quotes or claims changed.
- **Uploaded content.md:** replace the project's content.md (and the proof doc's Content tab, while one is open), keep the old one as `content.v<n>.md`, and diff them in log.md (one line per changed section).
- **Approve:** refuse to approve while CHECK flags remain, unless the user explicitly accepts them ("keep it as is"); then delete those comments and note the acceptance in log.md. Also remove any claims.md row still marked VERIFY only if the user confirms it. Set `status: approved`, bump `version` and log the approval. If exports are named (in the request or the `exports` list), start `prism-produce` for them straight away, without asking. Otherwise tell the user they can now ask for outputs ("produce a sheet and a carousel").
