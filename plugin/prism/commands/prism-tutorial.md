---
description: A guided walkthrough of Prism on a sample piece, from the prompt to the proof, design mode, the export and other formats; add a topic for just that part
argument-hint: "[optional: a topic such as design mode, quick mode, photos; rundown for the overview; a brand to use]"
---

What the person typed after the command decides what they get:

- **Nothing** (or a brand, "walkthrough", "guided"): the guided walkthrough. Read `${CLAUDE_PLUGIN_ROOT}/skills/prism-draft/references/walkthrough.md` and run it: a real sample piece in the default brand (or the brand they named), stage by stage, with a pause after each one.
- **"rundown"** (or "overview", "summary"): the whole rundown. Read `${CLAUDE_PLUGIN_ROOT}/skills/prism-draft/references/tutorial.md` and follow its instructions for presenting it. Don't start drafting or building anything.
- **A topic** ("design mode", "photos"): only that section of the rundown in `tutorial.md`, in a little more depth, then offer the walkthrough (`/prism-tutorial`) to see it done. Don't start drafting or building anything.

What the person typed: $ARGUMENTS
