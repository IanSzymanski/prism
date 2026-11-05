# Brands from design systems (Claude only; once per session)

A brand's Prism files live in its own Claude Design System, in `project/prism/` beside the design system's tokens, fonts and images. Anyone in the organization who can open the design system can use the brand; only its editors and owners can change it. A session brings the brands it can reach into the workspace (`.prism/brands/<id>/`), where every build reads them; a brand read from its design system replaces the copy bundled with the plugin. Brands bundled with the plugin keep working without any of this.

Do this once per session, right after the kit is synced to `.prism-kit`, before reading `run.sh brands`. Say nothing about it unless something below says to.

1. **List the design systems** the person can open: the Artifact tool's list with `type: "Design System"` and `scope: "all"`. Note the row marked as the person's or the organization's default, if any. None listed, or the list fails: stop here.
2. **Plan.** `bash .prism-kit/run.sh ds plan [--default <default's link>] <every listed link>`. It says `check` or `skip` for each: it looks only at the brands installed here, the default, the design systems the bundled brands came from, and design systems it hasn't seen this week. When the person names a brand that neither `run.sh brands` nor this session has, run it again with `--all`.
3. **Look at each `check`**: read `project/prism/profile.json` from it (the Artifact tool's read with its link and that path in `paths`, into the default folder; one call each, all in one message). A file listing isn't needed: the read names the design system's version even when there is no Prism folder. Then `bash .prism-kit/run.sh ds seen <link> <version> <yes|no>`, `yes` when the profile was saved. It answers:
   - `current <id>`: this version is already here. Nothing to read.
   - `none`: not a Prism brand. Nothing to do.
   - `gone <id>`: its editors took the Prism folder out: `bash .prism-kit/run.sh ds remove <id>`.
   - `read`: a Prism brand, new or changed. Read the rest of it (step 4).
4. **Read the rest of a brand**, into the same folder (the tool's default for that design system):
   1. `bash .prism-kit/run.sh ds want <the folder the read named> --fresh` clears what an earlier read of this design system left in that folder (it would be taken for this version) and prints the other paths the brand uses (its Prism files, the tokens and fonts, the README and index, and the files it was checked against). Read them in one call (`paths`). Run `ds want <folder>` again, without `--fresh`: now that it has the tokens, it prints any font they name that the brand wasn't checked with; read those too. A path the design system doesn't have is fine to leave unread; install says if the brand needs it.
   2. Its images are uploads: `bash .prism-kit/run.sh ds assets <folder>` prints the ids of the ones the brand uses. Read them in one call (`paths`). Any the result says it couldn't read: read each with `path`, all in one message.
   3. `bash .prism-kit/run.sh ds place <folder>`, then `bash .prism-kit/run.sh ds install <folder> --url <link> --version <version> --title "<title>"`, adding `--default` when it is the default design system.
5. **What install says.** It checks the brand builds before it replaces anything, so a failed install leaves the copy builds use as it was. Pass on once, in a line each:
   - `does not build, so it was not installed`: which brand and the reason it printed; builds keep the copy they had. Its editors fix it with `/prism-onboard`.
   - `[brand] design system changed since this brand was checked`: the brand builds; its editors can re-check it with `/prism-onboard`.
   - `an onboarding draft of <id> is in ...`: a draft in progress here; leave it.
6. **Default brand.** `--default` makes the default design system's brand this workspace's default. When the person names another ("use IntelliTect by default"), `bash .prism-kit/run.sh ds default <id>`. Without either, the default is the bundled one `run.sh brands` marks.

A read that fails or is refused is not an error: carry on with what is installed and bundled, and say nothing. `bash .prism-kit/run.sh ds status` shows what is installed, the default, and what has been seen.
