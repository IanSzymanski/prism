# Films: a motion format file to a Claude Motion film

A motion output is made by Claude in the Motion artifact type (Team and Enterprise plans), from a brief Prism writes. Prism checks what Motion made; the person exports the MP4 from the film's page. Motion outputs skip design mode: the film page is where they are reviewed, scrubbed and commented on. Paths below: `<dir>` is `<slug>/motion/<output id>` (the output id is `motion` unless a package names another).

## Make it

1. **Format, check, vet** as for every output: the formatter writes `formats/<output id>.md` from the motion card, then `run.sh check` and `run.sh vet`.
2. **Brief:** `.prism-kit/run.sh motion brief formats/<output id>.md --out <dir>`. An error names the line: fix the format file (a layout or class question is a layout-lane edit) and run it again. It writes `<dir>/brief.md`, `<dir>/film.json` and prints an `upload:` line. A `film:` line means this output already has a film: go to "Revise it" instead.
3. **Motion available?** List the Artifact types (the Artifact tool's list, `scope: "types"`) and find the one titled Motion. None: say in one line that films need the Motion artifact type (Team and Enterprise plans, switched on by an admin) and stop for this output; the other outputs carry on.
4. **Create the film:** publish with the Motion `type_url`, `title` = the format file's `title`, `auto_open: "after_first_write"`, nothing else. Record it: `.prism-kit/run.sh motion link <dir> <the film's url>`.
5. **Upload the brand files** in one call: publish to the film's url with `asset: true` and the `upload:` line's `file_paths`. Each `assets/<name>` record uses the name the brief gives that file (`brief.md` lists them; the logo is `logo.<ext>` whatever its file is called), with the `ref` and content type the upload returned.
6. **Make the film from the brief.** Follow the Motion type's own instructions (they come with the create result) with the whole text of `brief.md` as the request. The brief settles Style, Colors and Length, so Motion asks nothing; take every scene's id, name, seconds and words exactly as the brief gives them. Prism's rules override nothing in Motion's, and Motion's never loosen Prism's: words verbatim, no new numbers, no invented logos or people.
7. **Read it back:** with ArtifactData, `list` the film's `film`, `modules` and `assets` collections, each with `out_dir: <dir>/store`. Then `.prism-kit/run.sh motion check <dir> <dir>/store`.
   - `OK`: go on.
   - `CHECK`: each line names a scene. Mend that scene in the film (Motion's "Revising a film": `list` modules, `set` only that scene with its version), read back, check again. Two rounds at most, then report what is left under "Needs your call".
   - `PAGE EDITS`: lines the person retyped on the film page. Vet each (`vet` rules: typos fixed and reported, meaning never changed), and ask once whether they go back into content.md (content lane) or stay in this film only (the format file takes them; log.md notes it).
8. **Look at it:** once per session, read the film's player files with the Artifact tool (`read`, `paths: ["index.html", "artifact-type/app.js", "artifact-type/app.css"]`, `out_dir: <dir>/player`). Then `.prism-kit/run.sh motion render <dir> <dir>/store <dir>/player`. It runs the film in the kit's Chromium with no network, writes stills of frame 0 and of every scene, and a contact sheet, and fails on a load error, a runner error, a frame that changes when seeked back to, a wrong length or a sound the player lacks. Look at `contact-sheet.png` like any visual check: frame 0 readable (it is the thumbnail), no text cut off or overlapping, nothing in the aspect's unsafe band, the logo whole, the brand digest's placement rules. Mend in the film and render again, two rounds at most. An upload the kit doesn't hold (one the person added on the page): read it from the film by its id (`read`, `path` = the id) into a folder and add `--assets <folder>`.
9. **Deliver:** open the film (the Artifact tool's `open`) and send the contact sheet. One line each:
   - the film: the finished piece; **Export** on its page saves the MP4 (it starts muted; the speaker button plays the score);
   - `formats/<output id>.md`: the editable source;
   - it is private: others can open the link once it is shared from the page's Share menu.
   Record the export: `.prism-kit/run.sh state <slug> export <output id> <dir>/film.json` (it holds the film's url).

## Revise it

The same two lanes as every format. The film is never remade for a change, and never republished: it is revised in place, so its link, comments and the person's page edits stay.

- **Comments on the film page** arrive pinned to a moment (`Location: 0:12`). `film.json` gives each scene's `start` and `dur`: map the moment to its scene id, then classify the request.
- **Content lane** (wording, numbers, quotes): content.md first, the reviewer when a claim changed, then the format file is patched, as for every output.
- **Layout lane** (timing, order, size, how a line moves, a scene added or dropped): the format file only.
- Then `run.sh motion brief` again (same `<dir>`; it keeps the film's url), and revise the film from the new brief by Motion's "Revising a film": change only the scenes whose lines, classes or seconds changed (and `scenes.json` for order, names and seconds; `score.js` when times moved), with their versions. Read back, check, render, deliver, read back to the person in the usual four parts.
