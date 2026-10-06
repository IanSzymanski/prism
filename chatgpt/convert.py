#!/usr/bin/env python3
"""Builds the ChatGPT edition of prism from the Claude plugin, then zips both.
Usage: convert.py VERSION. Every plugin change is made in the Claude copy first; this script derives the other."""
import glob, json, os, re, shutil, subprocess, sys

VER = sys.argv[1]
# Paths default to this bundle's layout; override with PRISM_SRC, PRISM_OUT, PRISM_META, PRISM_DIST.
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("PRISM_SRC", os.path.join(HERE, "..", "plugin", "prism"))
OUT = os.environ.get("PRISM_OUT", os.path.join(HERE, "prism"))
META = os.environ.get("PRISM_META", os.path.join(HERE, "meta"))
DIST = os.environ.get("PRISM_DIST", os.path.join(HERE, "..", "dist"))
JUNK = ["__pycache__", "node_modules", "mods", "cache", "env.sh", ".ready-sheet", ".ready-deck", ".setup.lock"]


def ed(p, a, b):
    s = open(p).read()
    assert a in s, (p, a[:70])
    open(p, "w").write(s.replace(a, b, 1))


def sub(p, pat, rep, flags=0):
    s = open(p).read()
    s2, n = re.subn(pat, rep, s, flags=flags)
    assert n, (p, pat[:70])
    open(p, "w").write(s2)


# Claude version numbers first, so both editions always match.
for p in ["skills/prism-draft/SKILL.md", "skills/prism-produce/SKILL.md", "skills/prism-quick/SKILL.md"]:
    sub(f"{SRC}/{p}", r'version: "[^"]+"', f'version: "{VER}"')
m = json.load(open(f"{SRC}/.claude-plugin/plugin.json")); m["version"] = VER
json.dump(m, open(f"{SRC}/.claude-plugin/plugin.json", "w"), indent=2)
open(f"{SRC}/skills/prism-produce/kit/VERSION", "w").write(VER + "\n")

shutil.rmtree(OUT, ignore_errors=True)
shutil.copytree(SRC, OUT, ignore=shutil.ignore_patterns(*JUNK))
os.chdir(OUT)
shutil.rmtree(".claude-plugin"); shutil.rmtree("agents")
# Slash commands are Claude only; in ChatGPT the same flows start from a phrase ("interview me").
shutil.rmtree("commands", ignore_errors=True)
for f in [".codex-plugin", "plugin.json", "assets", "README.md"]:
    s = f"{META}/{f}"
    (shutil.copytree if os.path.isdir(s) else shutil.copy)(s, f)
for p in ["plugin.json", ".codex-plugin/plugin.json"]:
    m = json.load(open(p)); m["version"] = VER; json.dump(m, open(p, "w"), indent=2)

# prism-draft: agents become passes, Claude tools become plain instructions.
d = "skills/prism-draft/SKILL.md"
sub(d, r"## Running the subagents\n\n.*?\n\n(?=## 1)", """## Passes

The writer and reviewer are separate passes you run yourself, one after the other. For each, read the instructions in `references/agents/<name>.md` and follow them as that role, with only the inputs listed. Finish one pass before starting the next, and review with fresh eyes: the reviewer flags, it does not defend the writer's choices.

""", re.S)
ed(d, "- Work in the session workspace. Create", "- Work in `/mnt/data`. Create")
ed(d, "Copy `../prism-produce/kit` to `<workspace>/.prism-kit`", "Copy `../prism-produce/kit` (next to this skill's folder) to `/mnt/data/.prism-kit`")
ed(d, "2. Look at every image with the Read tool.", "2. Look at every image yourself.")
ed(d, "in one AskUserQuestion call. Every question offers \"Skip for now\":", "in one message: numbered questions, each with suggested answers the user can reply to by number, and \"skip\" always allowed:")
ed(d, "Ask in a second call only what", "Ask in a second message only what")
ed(d, "Ask in AskUserQuestion calls of up to four questions, one call straight after another:", "Ask them all in one message, numbered, each with suggested answers the user can reply to by number:")
ed(d, "ask the image questions (hero, use, people and permission, captions) in one more call.", "ask the image questions (hero, use, people and permission, captions) in one more message.")
ed(d, "ask about them in the next AskUserQuestion call (four questions at most; any overflow in another call):", "ask about them in your next message:")
ed(d, ", or when the session is unattended.", ", or when the user asks you to go ahead without questions.")
ed(d, "for anything skipped or unattended:", "for anything skipped:")
ed(d, "; \"later\" can be any time, design mode included.", "; \"later\" can be any time.")
ed(d, " (to the proof doc instead, while one is open)", "")
ed(d, " (and the proof doc's Content tab, while one is open)", "")
ed(d, "never put it in the proof, a design canvas, a built file or any connector", "never put it in the proof, a built file or any connector")
c = "skills/prism-draft/references/content-spec.md"
ed(c, "never put in content.md, the proof, a design canvas, a built file, a connector or log.md.", "never put in content.md, the proof, a built file, a connector or log.md.")
ed(d, "## 3. Write and review (subagents)", "## 3. Write and review (two passes)")
ed(d, "1. Run the **prism-writer** agent. Pass:", "1. **Writer pass** (`references/agents/prism-writer.md`). Inputs:")
ed(d, "2. Run the **prism-reviewer** agent on the result. Pass:", "2. **Reviewer pass** (`references/agents/prism-reviewer.md`) on the result. Inputs:")
ed(d, "Send `content.md` and `claims.md` (and `images.md` when there are images) to the user with SendUserFile.", "Give the user download links to `content.md` and `claims.md` (and `images.md` when there are images), and show the content.md text in the reply so it can be proofed without downloading.")
ed(d, "Re-run prism-reviewer on the changed sections", "Run the reviewer pass again on the changed sections")

# prism-produce
p = "skills/prism-produce/SKILL.md"
sub(p, r"## Running the subagents\n\n.*?\n\n(?=## 0)", """## Passes

The formatter and reviewer are separate passes you run yourself. For each, read `references/agents/<name>.md` and follow it as that role, with only the inputs listed. Several exports: one formatter pass per export, one after another, each reading only its own format card.

""", re.S)
ed(p, "- `references/agents/`: agent instructions, for when the agents are not installed.", "- `references/agents/`: instructions for the formatter and reviewer passes.")
ed(p, "3. Once per session: copy `kit/` to `<workspace>/.prism-kit`.", "3. Once per conversation: copy `kit/` to `/mnt/data/.prism-kit`.")
ed(p, "install that tool (`apt-get install -y pandoc` for pandoc) and build again.", "tell the user which tool is unavailable and stop.")
ed(p, "## 1. Format (subagents)", "## 1. Format (formatter passes)")
ed(p, "- One export: format it yourself, following the same rules as the prism-formatter agent and its card.\n- Two or more: run one **prism-formatter** agent per export, in parallel. Pass each:", "- One formatter pass per export (`references/agents/prism-formatter.md`), one after another. Inputs for each:")
ed(p, "- Send the built files with SendUserFile:", "- Save everything under `/mnt/data/<slug>/out/` and give a download link for each file:")
sub(p, r" If a folder from the user's computer is connected, also write content\.md, the format files and out/ there\.", "")
ed(p, "3. Patch every existing format file: run **prism-formatter** in mode `patch` per format (parallel when several), passing the change.", "3. Patch every existing format file: a formatter pass in mode `patch` per format, passing the change.")
ed(p, "2. If numbers, quotes or claims changed, run **prism-reviewer** on the changed sections", "2. If numbers, quotes or claims changed, run the reviewer pass on the changed sections")
ed(p, "and look at the image.", "and look at the image yourself (show it in the reply too).")
ed(p, "(uploaded after approval, during design mode or after delivery)", "(uploaded after approval or after delivery)")
ed(p, "4. In design mode, republish the changed boards; otherwise number check, rebuild, deliver.", "4. Number check, rebuild, deliver.")

# prism-quick: setup runs inside the first build, since background processes may not survive between code calls.
q = "skills/prism-quick/SKILL.md"
ed(q, "no interview, no subagents, no content.md, no proof stop (no proof doc),", "no interview, no separate review passes, no content.md, no proof stop,")
sub(q, r"## 1\. Start \(one Bash call, first thing\)\n\n```bash\n.*?```\n\n.*?In the same call:", """## 1. Start (one code call, first thing)

```bash
cd /mnt/data && mkdir -p <slug>/source <slug>/formats <slug>/out
[ -d .prism-kit ] || cp -r <this skill's folder>/../prism-produce/kit .prism-kit
```

The first build of each output type sets up its tools (a few seconds when they are present, up to about 40 seconds when they must be installed). In the same call:""", re.S)
ed(q, "Look at each photo once with Read to spot identifiable people.", "Look at each photo once to spot identifiable people.")
ed(q, "## 3. Write the format file in one Write call", "## 3. Write the format file in one go")
ed(q, "1. One Bash call: check numbers", "1. One code call (from `/mnt/data`): check numbers")
ed(q, "5. Send the PDF (or the PNGs and the captions file, or the PPTX) and the format file with SendUserFile.", "5. Give download links to the PDF (or the PNGs and the captions file, or the PPTX) and the format file.")

# Shared wording
for f in glob.glob("skills/*/SKILL.md"):
    s = open(f).read()
    s = re.sub(r'metadata:\n  version: "[^"]+"\n', "", s)
    s = s.replace("`pdftotext file.pdf`", "`pdftotext file.pdf`, or PyMuPDF when pdftotext is missing")
    s = s.replace("use the prism-quick skill instead.", "use the prism-quick skill instead.")
    open(f, "w").write(s)
for f in glob.glob("skills/*/references/agents/*.md"):
    s = open(f).read()
    s = re.sub(r"Used when the prism-\w+ agent is not installed:.*?\n", "Instructions for one pass. Follow them as this role, using only the inputs listed; then return to the skill.\n", s)
    s = s.replace("`pdftotext`", "`pdftotext` (or PyMuPDF when it is missing)")
    open(f, "w").write(s)

# Claude-only features (the wireframe review on a Claude Design canvas) are cut from the ChatGPT edition.
for f in glob.glob("skills/**/*.md", recursive=True):
    t = open(f).read(); t2 = re.sub(r"\n?<!-- claude-only -->[\s\S]*?<!-- /claude-only -->\n?", "\n", t)
    if t2 != t: open(f, "w").write(t2)
for f in ["skills/prism-produce/references/wireframe.md", "skills/prism-produce/kit/build-wire.js", "skills/prism-produce/kit/wire_diff.py"]:
    if os.path.exists(f): os.remove(f)
k = "skills/prism-produce/kit/run.sh"; t = open(k).read()
t = t.replace('  wire)    node "$KIT/build-wire.js" "$@" ;;\n  wire-diff) python3 "$KIT/wire_diff.py" "$@" ;;\n', "").replace("|wire|wire-diff", "").replace("|wire)", ")")
open(k, "w").write(t)

# Nothing Claude-specific may remain.
# Design mode is Claude only: in ChatGPT, visual layout requests are taken as chat edits.
ed("skills/prism-produce/SKILL.md", "- Say how revisions work: reply with changes, or upload an edited content.md or format file.", "- Say how revisions work: reply with changes, or upload an edited content.md or format file. Asked for design mode or visual editing: explain that it isn't available here and take the layout changes described in chat (move, cut, reorder) through the layout lane.")
ed("skills/prism-quick/SKILL.md", "- **Changes in chat", "- **Design mode or visual editing:** not available here; take the changes described in chat.\n- **Changes in chat")
left = subprocess.run(["grep", "-rniE", r"subagent|SendUserFile|AskUserQuestion|Read tool|Cowork|workspace|parallel|Bash call|with Read\b|wireframe|Claude Design|claude-only", "--include=*.md", "skills"], capture_output=True, text=True).stdout
assert not left.strip(), left

# Zips: manifest and skills at the top level of the ChatGPT zip; the Claude zip keeps its folder.
for z in [f"{DIST}/prism-chatgpt-{VER}.zip", f"{DIST}/prism-{VER}.zip"]:
    if os.path.exists(z): os.remove(z)
ex = sum([["-x", f"*/{j}/*", "-x", f"*/{j}"] for j in JUNK], [])
os.makedirs(DIST, exist_ok=True)  # a fresh clone has no dist/
subprocess.run(["zip", "-qr", f"{DIST}/prism-chatgpt-{VER}.zip", "."] + sum([["-x", f"*{j}*"] for j in JUNK], []), check=True, cwd=OUT)
subprocess.run(["zip", "-qr", f"{DIST}/prism-{VER}.zip", "prism"] + ex, check=True, cwd=os.path.dirname(SRC))
print("built", VER)
