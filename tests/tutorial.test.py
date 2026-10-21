#!/usr/bin/env python3
"""The tutorial stays in step with the plugin: tools/check-tutorial.py passes on the real plugin and catches each kind of drift
(a new command, format card or skill, the brand list, a new release) on a changed copy; the guided walkthrough and its samples
(run.sh tutorial) stay complete.
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

    d = copy(); open(tut(d), "w").write(open(tut(d)).read().replace("carousel", "slideshow"))
    r = run(ver, d); check("a format the tutorial stops naming fails", r.returncode == 1 and "format:carousel" in r.stdout, r.stdout)

    walk = lambda d: os.path.join(d, "skills", "prism-draft", "references", "walkthrough.md")
    d = copy(); os.remove(walk(d))
    r = run(ver, d); check("a missing walkthrough fails", r.returncode == 1 and "walkthrough" in r.stdout and "missing" in r.stdout, r.stdout)

    d = copy(); open(walk(d), "w").write(open(walk(d)).read().replace("Claude Design", "the canvas tool"))
    r = run(ver, d); check("a walkthrough that skips a stage fails", r.returncode == 1 and "Claude Design" in r.stdout, r.stdout)

    d = copy(); open(walk(d), "w").write(open(walk(d)).read().replace("carousel", "slideshow"))
    r = run(ver, d); check("a format the walkthrough stops naming fails", r.returncode == 1 and "format:carousel: the walkthrough" in r.stdout, r.stdout)

    d = copy(); c = os.path.join(d, "commands", "prism-tutorial.md"); open(c, "w").write(open(c).read().replace("walkthrough.md", "tutorial.md"))
    r = run(ver, d); check("/prism-tutorial must run the walkthrough", r.returncode == 1 and "does not run the walkthrough" in r.stdout, r.stdout)

    d = copy(); sj = os.path.join(d, "skills", "prism-produce", "kit", "tutorial", "sample.json")
    s = json.load(open(sj)); s["more"].append({"format": "poster", "prompt": "x"}); s["source"].append("gone.md"); json.dump(s, open(sj, "w"))
    r = run(ver, d)
    check("a sample offering a format that doesn't exist fails", r.returncode == 1 and "more offers poster" in r.stdout, r.stdout)
    check("a sample missing a source file fails", "gone.md is missing" in r.stdout, r.stdout)

    d = copy(); b = os.path.join(d, "skills", "prism-produce", "kit", "brands", "acme", "tutorial"); os.makedirs(b)
    json.dump({"slug": "x", "title": "x", "prompt": "x", "answers": {"figures": "real"}, "source": [], "try": {}, "more": []}, open(os.path.join(b, "sample.json"), "w"))
    r = run(ver, d); check("a brand's own sample is checked too", r.returncode == 1 and "brand acme's sample" in r.stdout and "illustrative" in r.stdout, r.stdout)

    d = copy(); open(walk(d), "w").write(open(walk(d)).read().replace("--prompt", "--summary"))
    r = run(ver, d); check("a walkthrough that doesn't show the full sample message fails", r.returncode == 1 and "--prompt" in r.stdout, r.stdout)

    d = copy(); open(walk(d), "w").write(open(walk(d)).read() + "\nIn co-op mode, comments starting @claude are applied.\n")
    r = run(ver, d); check("co-op specifics in the walkthrough fail", r.returncode == 1 and "co-op" in r.stdout and "@claude" in r.stdout, r.stdout)

    # Fixed files: the default brand's sample carries them, and drift between them fails.
    brand_tut = lambda d: next(os.path.join(d, "skills", "prism-produce", "kit", "brands", b, "tutorial") for b in sorted(os.listdir(os.path.join(d, "skills", "prism-produce", "kit", "brands"))) if os.path.exists(os.path.join(d, "skills", "prism-produce", "kit", "brands", b, "tutorial", "sample.json")) and json.load(open(os.path.join(d, "skills", "prism-produce", "kit", "brands", b, "tutorial", "sample.json"))).get("fixed"))
    d = copy(); t = brand_tut(d); fx = json.load(open(os.path.join(t, "sample.json")))["fixed"]
    pf = os.path.join(t, fx["proof"]); pj = json.load(open(pf)); pj["comments"][0]["text"] = "Check: something the reviewer never said."; json.dump(pj, open(pf, "w"))
    r = run(ver, d); check("a proof comment that isn't the draft's flag fails", r.returncode == 1 and "word for word" in r.stdout, r.stdout)
    d = copy(); t = brand_tut(d); sf = os.path.join(t, fx["formats"]["sheet"]); open(sf, "a").write("\nA stray 73% figure.\n")
    r = run(ver, d); check("a fixed layout with a number not in the approved words fails", r.returncode == 1 and "fixed layout sheet has numbers" in r.stdout, r.stdout)
    d = copy(); t = brand_tut(d); sj2 = os.path.join(t, "sample.json"); s2 = json.load(open(sj2)); s2["fixed"]["cleanup"].append({"notes": "a typo nobody wrote", "draft": "x"}); json.dump(s2, open(sj2, "w"))
    r = run(ver, d); check("a cleanup pair not in the notes fails", r.returncode == 1 and "a typo nobody wrote" in r.stdout, r.stdout)
    d = copy(); t = brand_tut(d); af = os.path.join(t, fx["approved"]); open(af, "a").write("\nStill here. <!-- CHECK: x -->\n")
    r = run(ver, d); check("approved words with a flag left fail", r.returncode == 1 and "no CHECK flags" in r.stdout, r.stdout)

    # run.sh tutorial: the default brand's sample by default, set up once and then kept.
    KIT = os.path.join(PLUGIN, "skills", "prism-produce", "kit")
    tut_js = lambda *a: subprocess.run(["node", os.path.join(KIT, "tutorial.js"), *a], capture_output=True, text=True)
    r = tut_js("--json"); j = json.loads(r.stdout) if r.returncode == 0 else {}
    check("run.sh tutorial uses the default brand", j.get("brand") and subprocess.run(["node", os.path.join(KIT, "brands.js")], capture_output=True, text=True).stdout.find(f"{j.get('brand')} (default)") >= 0, r.stdout + r.stderr)
    ws = os.path.join(tmp, "ws"); r = tut_js("--out", ws, "--json"); j = json.loads(r.stdout)
    check("run.sh tutorial --out sets the sample piece up", j["created"] and all(os.path.isdir(os.path.join(j["project"], x)) for x in ["source", "formats", "out"]) and os.listdir(os.path.join(j["project"], "source")), r.stdout)
    open(os.path.join(j["project"], "content.md"), "w").write("mine")
    j2 = json.loads(tut_js("--out", ws, "--json").stdout)
    check("a second run keeps the piece as it is", not j2["created"] and open(os.path.join(j["project"], "content.md")).read() == "mine", j2)
    r = tut_js("--prompt"); j = json.loads(tut_js("--json").stdout)
    check("--prompt shows the prompt and every source file in full", r.returncode == 0 and r.stdout.startswith(j["prompt"]) and all(open(f).read().strip() in r.stdout for f in j["source"]), r.stdout[:300])
    fws = os.path.join(tmp, "fws"); j = json.loads(tut_js("--out", fws, "--json").stdout)
    if j.get("fixed"):
        p = j["project"]
        check("the walkthrough's cleanup pairs come through --json", len(j["fixed"].get("cleanup", [])) > 0, j["fixed"])
        check("--out puts the fixed draft in place", "CHECK:" in open(os.path.join(p, "content.md")).read() and os.path.exists(os.path.join(p, "claims.md")), os.listdir(p))
        r = tut_js("--out", fws, "--approve")
        check("--approve puts the fixed approved words in place and keeps the draft", r.returncode == 0 and "status: approved" in open(os.path.join(p, "content.md")).read() and os.path.exists(os.path.join(p, "content.v1.md")), r.stdout + r.stderr)
        for f in j["fixed"]["formats"]:
            r = tut_js("--out", fws, "--format", f)
            check(f"--format {f} puts the fixed layout in place, numbers matching", r.returncode == 0 and subprocess.run(["node", os.path.join(KIT, "check-numbers.js"), os.path.join(p, "content.md"), os.path.join(p, "formats", f + ".md")], capture_output=True).returncode == 0, r.stdout + r.stderr)
        r = tut_js("--out", fws, "--format", "no-such-format"); check("a format with no fixed layout says so", r.returncode == 3, r.stderr)
        a = open(os.path.join(p, "formats", j["fixed"]["formats"][0] + ".md")).read(); tut_js("--out", fws, "--format", j["fixed"]["formats"][0])
        check("the fixed layout is the same every run", a == open(os.path.join(p, "formats", j["fixed"]["formats"][0] + ".md")).read())
        # The fixed sheet builds to what the sample expects: two pages, the steps together (a first run once came out at four).
        exp = (j["fixed"].get("expect") or {}).get("sheet")
        check("the fixed sheet has an expectation", bool(exp), j["fixed"])
        if exp:
            tut_js("--out", fws, "--format", "sheet"); pdf = os.path.join(p, "out", "sheet.pdf")
            r = subprocess.run(["bash", os.path.join(KIT, "run.sh"), "sheet", os.path.join(p, "formats", "sheet.md"), pdf], capture_output=True, text=True)
            try:
                import pymupdf
                pages = [pg.get_text() for pg in pymupdf.open(pdf)] if r.returncode == 0 else []
                check(f"the fixed sheet builds to {exp['pages']} pages", len(pages) == exp["pages"], r.stdout[-300:] + r.stderr[-300:])
                check("the fixed sheet keeps its steps on one page", any(all(w in t for w in exp["same_page"]) for t in pages), [[w for w in exp["same_page"] if w in t] for t in pages])
            except ImportError: check("PyMuPDF is installed (pip install pymupdf)", False)
    else: check("the default brand's sample has fixed files", False, "no fixed: in its sample.json")
    r = tut_js("no-such-brand"); check("an unknown brand stops", r.returncode == 2 and "no brand" in r.stderr, r.stderr)

    major, minor = ver.split("-")[0].split(".")[:2]
    r = run(f"{major}.{int(minor) + 1}.0-dev")
    check("a new release needs a fresh review", r.returncode == 1 and "tutorial was last reviewed for" in r.stdout, r.stdout)
    check("a new release needs a fresh look at the walkthrough too", "walkthrough was last reviewed for" in r.stdout, r.stdout)
    r = run(f"{major}.{minor}.9")
    check("a patch release of the same minor passes", r.returncode == 0, r.stdout)
finally:
    shutil.rmtree(tmp, ignore_errors=True)

for f in fails: print("FAIL", f)
print(f"{n - len(fails)}/{n} checks passed")
sys.exit(1 if fails else 0)
