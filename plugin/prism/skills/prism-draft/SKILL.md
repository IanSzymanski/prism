---
name: prism-draft
description: >
  Use to start any Case Amplify content piece from raw material (notes, a transcript, a document, pasted
  text, photos): "draft this", "turn this into a case study / blog post / one sheet / flyer / brochure / deck / posts",
  "make something from these notes". Also handles proofing: "approve the draft", "looks good",
  "here are my edits", or an edited content.md uploaded before anything has been produced.
metadata:
  version: "0.14.0-dev"
---

# Draft: raw material to an approved content.md

If the user wants a finished document right away with no proofing first ("quick", "fast", "just make it"), use the prism-quick skill instead.

This skill never builds files. Designed outputs are built only by prism-produce or prism-quick, with the Case Amplify kit.

This is steps 1–4 of the Case Amplify content process. It ends at a human proofing stop. Formatting and building happen in the `prism-produce` skill, never here.

References (read before starting): `references/content-spec.md` and the brand's rules, `../prism-produce/kit/brands/<brand>/digest.md` (`<brand>` from the request or content.md `brand:`, default `case-amplify`).

## Running the subagents

Use the named agent (prism-writer, prism-reviewer, prism-formatter) when it is installed. If it is not (this skill was installed on its own, without the plugin), start a general-purpose subagent instead, with the full text of `references/agents/<agent>.md` as the start of its prompt, followed by the inputs listed below. The instructions are identical either way.

## 1. Set up the project

- Work in the session workspace. Create `<slug>/` (short kebab-case name from the topic) with `source/`, `formats/`, `out/`.
- Save every raw input unchanged into `source/`: uploaded files by copy, pasted text as `source/pasted-<n>.md`, transcripts as-is. Audio is not accepted; ask for a transcript (phone dictation, Teams/Zoom/Otter transcript) if audio is all there is.
- Start `log.md` with the date, the inputs, and the brief.

### Images

When the upload includes images (JPG, PNG, WebP, HEIC):

1. Keep the originals in `source/`. Normalise copies into `images/` with the kit: copy `../prism-produce/kit` to `<workspace>/.prism-kit` if it is not there yet, then `bash .prism-kit/run.sh images <slug>/images <image files>`. It fixes phone rotation, converts colour, and prints a table of pixels, orientation and how large each can print. HEIC may fail to open; ask for JPG or PNG then.
2. Look at every image with the Read tool. Note what it shows, whether identifiable people are in it (and whether they look like staff, clients or children), any text in the image, and anything that makes it unusable (blur, screenshots of private data, other organisations' branding).
3. Write `images.md` as described in `references/content-spec.md`: the kit's columns plus Shows, People and a proposed Role. Propose one hero only if a landscape image prints at 6.5 in or wider and suits the opening.

## 2. Intake

Establish four things. Take them from the request when stated; ask only for the missing ones, in one AskUserQuestion call:

1. **Audience**: who reads it.
2. **Exports**: any of sheet, brochure, deck, social, email (header images), html-email (the whole email: newsletter, announcement or letter), carousel, blog. Can be changed later.
3. **Figures**: real (from sources) or illustrative (fictional example).
4. **Piece type** if not obvious: case study, one-pager, brief, announcement, guide, blog post. For a blog post also establish its blog type (educational, insights, features, spontaneous, impact, changelog) and author, and ask whether they have a header photo to upload (faded into a brand gradient) or, for features, a product screenshot. Without one the header is a brand gradient. A changelog is its own series: ask for its release line ("Release 2.4 · September 2026"). Record them in content.md front matter as `blog-type`, `author`, `role`, `tags`.

With images, add image questions to the same AskUserQuestion call (it holds four questions; drop brief questions the request already answers first, and ask any overflow in a second call):

- **Hero**: "Which image should lead the piece?" Options: the landscape images that print at 6.5 in or wider, by a short description, plus "No hero image". Skip when there is no candidate.
- **Use**: "Which images should go in?" (multi-select), when there are more than three or some look weak. Mention low resolution in the option descriptions.
- **People and permission**: when any image shows identifiable people: "The photos of [short description] show people. Who are they, and do we have permission to use them?" Options such as "Our staff, with permission", "Clients, with signed consent", "Stock or licensed", "Not sure, leave them out". Clients or minors without confirmed consent are left out.
- **Captions**: only if the images' context is unclear from the text: "What should the caption say for [image]?" Otherwise the writer drafts captions and they are proofed with the rest.

Record the answers in images.md (Role, People columns) and in log.md.

If the session is unattended, assume: audience "human services program leaders", exports "sheet", figures "real", and record the assumptions in log.md.

## 3. Write and review (subagents)

1. Run the **prism-writer** agent. Pass: project path, source file paths, the brief, the path of images.md when there are images, and absolute paths of `references/content-spec.md` and the brand digest. It writes `content.md` and `claims.md`.
2. Run the **prism-reviewer** agent on the result. Pass: paths of content.md, claims.md, images.md (if any), the brand digest, and the source files. It adds `<!-- CHECK -->` flags inline.
3. Read content.md yourself once. Confirm front matter is complete and no layout markup crept in.

## 4. Proofing stop

Send `content.md` and `claims.md` (and `images.md` when there are images) to the user with SendUserFile. Then write a short message:

- one line on what the piece is and its sections;
- the reviewer's flags, numbered, most serious first, and every claims.md row marked VERIFY;
- how to proof: reply with changes in chat, or edit content.md and upload it; say "approve" when the words are right.

Stop. Do not format or build anything until the user approves.

## Handling the proof

- **Edits in chat:** apply them to content.md with Edit. Resolve a CHECK flag only when the edit addresses it. Re-run prism-reviewer on the changed sections only if numbers, quotes or claims changed.
- **Uploaded content.md:** replace the project's content.md, keep the old one as `content.v<n>.md`, and diff them in log.md (one line per changed section).
- **Approve:** refuse to approve while CHECK flags remain, unless the user explicitly accepts them ("keep it as is"); then delete those comments and note the acceptance in log.md. Also remove any claims.md row still marked VERIFY only if the user confirms it. Set `status: approved`, bump `version` and log the approval. If exports are named (in the request or the `exports` list), start `prism-produce` for them straight away, without asking. Otherwise tell the user they can now ask for outputs ("produce a sheet and a carousel").
