#!/usr/bin/env python3
"""The tutorial stays in step with the plugin: tools/check-tutorial.py passes on the real plugin and catches each kind of drift
(a new command, format card or skill, the brand list, a command leaking into the ChatGPT copy, a new release) on a changed copy.
Usage: python3 tests/tutorial.test.py"""
import json, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK = os.path.join(ROOT, "tools", "check-tutorial.py")
PLUGIN = os.path.join(ROOT, "plugin", "prism")
fails, n = [], 0


def check(name, ok, detail=""):
    global n
    n += 1
    if not ok: fails.append(f"{name}: {str(detail)[:400]}")


def run(version, plugin=None):
    env = {**os.environ, **({"PRISM_PLUGIN": plugin} if plugin else {})}
    return subprocess.run([sys.executable, CHECK, version], capture_output=True, text=True, env=env)


ver = open(os.path.join(PLUGIN, "skills", "prism-produce", "kit", "VERSION")).read().strip()
r = run(ver)
check("the tutorial matches this plugin", r.returncode == 0, r.stdout)

tmp = tempfile.mkdtemp(prefix="prism-tut-")
try:
    def copy():
        d = os.path.join(tmp, "p"); shutil.rmtree(d, ignore_errors=True)
        shutil.copytree(PLUGIN, d, ignore=shutil.ignore_patterns("mods", "cache", "node_modules", "snapshot", "office", "vendor"))
        return d
    tut = lambda d: os.path.join(d, "skills", "prism-draft", "references", "tutorial.md")

    d = copy(); open(os.path.join(d, "commands", "prism-export.md"), "w").write("---\ndescription: x\n---\n")
    r = run(ver, d); check("a new command fails", r.returncode == 1 and "/prism-export" in r.stdout, r.stdout)

    d = copy(); open(os.path.join(d, "skills", "prism-produce", "references", "formats", "poster.md"), "w").write("# Poster\n")
    r = run(ver, d); check("a new format card fails", r.returncode == 1 and "format:poster is new" in r.stdout, r.stdout)

    d = copy(); os.makedirs(os.path.join(d, "skills", "prism-example-new"))
    r = run(ver, d); check("a new skill fails", r.returncode == 1 and "skill:prism-example-new is new" in r.stdout, r.stdout)

    d = copy(); b = os.path.join(d, "skills", "prism-produce", "kit", "brands", "acme"); os.makedirs(b)
    json.dump({"name": "Acme Health"}, open(os.path.join(b, "profile.json"), "w"))
    r = run(ver, d); check("a new brand needs no tutorial edit (brands are listed at run time)", r.returncode == 0, r.stdout)

    d = copy(); open(tut(d), "w").write(open(tut(d)).read().replace("run.sh brands", "the brand list"))
    r = run(ver, d); check("the tutorial must point at run.sh brands", r.returncode == 1 and "run.sh brands" in r.stdout, r.stdout)

    d = copy(); t = open(tut(d)).read().replace("## Try it", "Run /prism-interview to start.\n\n## Try it")
    open(tut(d), "w").write(t)
    r = run(ver, d); check("a command outside claude-only fails", r.returncode == 1 and "outside a claude-only section" in r.stdout, r.stdout)

    d = copy(); open(tut(d), "w").write(open(tut(d)).read().replace("carousel", "slideshow"))
    r = run(ver, d); check("a format the tutorial stops naming fails", r.returncode == 1 and "format:carousel" in r.stdout, r.stdout)

    major, minor = ver.split("-")[0].split(".")[:2]
    r = run(f"{major}.{int(minor) + 1}.0-dev")
    check("a new release needs a fresh review", r.returncode == 1 and "last reviewed for" in r.stdout, r.stdout)
    r = run(f"{major}.{minor}.9")
    check("a patch release of the same minor passes", r.returncode == 0, r.stdout)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

for f in fails: print("FAIL", f)
print(f"{n - len(fails)}/{n} checks passed")
sys.exit(1 if fails else 0)
