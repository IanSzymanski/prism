"""The docs stay current: DEVELOPING.md names every run.sh command and every test suite, README.md (what Prism is and how to
use it) points to it, the plugin README's outputs table has every output format, and each agent's fallback copy (for a
skill installed without the plugin) says exactly what the agent says.
Usage: python3 tests/readme.test.py"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit")
readme = open(os.path.join(ROOT, "DEVELOPING.md"), encoding="utf8").read()
front = open(os.path.join(ROOT, "README.md"), encoding="utf8").read()
plugin_readme = open(os.path.join(ROOT, "plugin", "prism", "README.md"), encoding="utf8").read()
ok = fails = 0
def check(cond, msg):
    global ok, fails
    if cond: ok += 1
    else: fails += 1; print("FAIL", msg)

# Every command in run.sh's case list (setup included) is named in the README, as `cmd` or `run.sh cmd`.
run = open(os.path.join(KIT, "run.sh"), encoding="utf8").read()
cmds = re.findall(r"^\s{2}([\w-]+)\)\s", run, re.M)
check(len(cmds) > 20, f"read run.sh's commands ({len(cmds)})")
for c in cmds: check(f"`{c}`" in readme or f"run.sh {c}" in readme, f"run.sh {c} is not in DEVELOPING.md")
# Every test suite is listed under Test.
for f in sorted(os.listdir(os.path.join(ROOT, "tests"))):
    if re.search(r"\.test\.(js|py)$", f): check(f"tests/{f}" in readme, f"tests/{f} is not in DEVELOPING.md")
# The README is for people using Prism; it sends developers to DEVELOPING.md.
check("(DEVELOPING.md)" in front, "README.md doesn't link DEVELOPING.md")
# Every output format card is in the plugin README's outputs table.
cards = [f[:-3] for f in os.listdir(os.path.join(KIT, "..", "references", "formats")) if f.endswith(".md") and f != "components.md"]
for c in cards: check(f"| {c} |" in plugin_readme, f"format {c} is not in plugin/prism/README.md's outputs table")
# Each agent prompt and its fallback copies (skills/*/references/agents/) say the same, below their own headers.
import glob
agents = sorted(glob.glob(os.path.join(ROOT, "plugin", "prism", "agents", "*.md")))
check(len(agents) >= 3, f"read the agents ({len(agents)})")
for a in agents:
    body = re.split(r"^---\s*$", open(a, encoding="utf8").read(), maxsplit=2, flags=re.M)[2].strip()
    copies = glob.glob(os.path.join(ROOT, "plugin", "prism", "skills", "*", "references", "agents", os.path.basename(a)))
    check(copies, f"{os.path.basename(a)} has no fallback copy")
    for c in copies:
        copy = re.sub(r"\A# [\w-]+ instructions\n\n.*?\n\n", "", open(c, encoding="utf8").read(), count=1, flags=re.S).strip()
        check(copy == body, f"{os.path.relpath(c, ROOT)} differs from agents/{os.path.basename(a)}")
print(f"{ok}/{ok + fails} checks passed")
sys.exit(1 if fails else 0)
