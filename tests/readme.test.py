"""The README stays current: it names every run.sh command and every test suite.
Usage: python3 tests/readme.test.py"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KIT = os.path.join(ROOT, "plugin", "prism", "skills", "prism-produce", "kit")
readme = open(os.path.join(ROOT, "README.md"), encoding="utf8").read()
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
for c in cmds: check(f"`{c}`" in readme or f"run.sh {c}" in readme, f"run.sh {c} is not in README.md")
# Every test suite is listed under Test.
for f in sorted(os.listdir(os.path.join(ROOT, "tests"))):
    if re.search(r"\.test\.(js|py)$", f): check(f"tests/{f}" in readme, f"tests/{f} is not in README.md")
# Every output format card is in the plugin README's outputs table.
cards = [f[:-3] for f in os.listdir(os.path.join(KIT, "..", "references", "formats")) if f.endswith(".md") and f != "components.md"]
for c in cards: check(f"| {c} |" in plugin_readme, f"format {c} is not in plugin/prism/README.md's outputs table")
print(f"{ok}/{ok + fails} checks passed")
sys.exit(1 if fails else 0)
