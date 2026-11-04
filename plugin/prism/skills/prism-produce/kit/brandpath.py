"""Where brands live, for the Python tools (the same rules as resolve.js): shipped brands in kit/brands, onboarding drafts and
brands read from their design systems in the workspace's .prism/brands (PRISM_DRAFTS overrides). A workspace brand wins over a
shipped brand of the same id; a draft is never the default."""
import json, os, re, sys

KIT = os.path.dirname(os.path.abspath(__file__))
SHIPPED = os.path.join(KIT, "brands")
DRAFTS = os.environ.get("PRISM_DRAFTS") or os.path.join(os.path.dirname(KIT), ".prism", "brands")


def brand_dir(bid):
    """The folder holding a brand's profile.json: a design system's prism/ folder or a draft in the workspace, else the shipped brand."""
    ds = os.path.join(DRAFTS, bid, "prism")
    if os.path.exists(os.path.join(ds, "profile.json")): return ds
    d = os.path.join(DRAFTS, bid)
    return d if os.path.exists(os.path.join(d, "profile.json")) else os.path.join(SHIPPED, bid)


def snapshot_dir(bid):
    """The design-system files a brand builds from: the design system itself for a brand read from it, else its snapshot/."""
    d = brand_dir(bid)
    return os.path.dirname(d) if os.path.basename(d) == "prism" and d.startswith(DRAFTS) else os.path.join(d, "snapshot")


def brand_file(bid, rel):
    """A path a profile gives: beside the profile, or snapshot/<path> for a design-system file."""
    return os.path.join(snapshot_dir(bid), rel[9:]) if rel.startswith("snapshot/") else os.path.join(brand_dir(bid), rel)


def default_brand():
    """The workspace's choice (.prism/brands/.default), else the shipped profile marked "default": true (or the only brand shipped)."""
    try:
        w = open(os.path.join(DRAFTS, ".default")).read().strip()
        if re.fullmatch(r"[a-z0-9-]+", w) and os.path.exists(os.path.join(DRAFTS, w, "prism", "profile.json")): return w
        if re.fullmatch(r"[a-z0-9-]+", w) and os.path.exists(os.path.join(SHIPPED, w, "profile.json")) and not os.path.exists(os.path.join(DRAFTS, w, "profile.json")): return w
    except OSError:
        pass
    ids = sorted(b for b in os.listdir(SHIPPED) if os.path.exists(os.path.join(SHIPPED, b, "profile.json")))
    marked = [b for b in ids if json.load(open(os.path.join(SHIPPED, b, "profile.json"))).get("default") is True]
    if len(marked) == 1: return marked[0]
    if not marked and len(ids) == 1: return ids[0]
    sys.exit("no single brand is marked \"default\": true in kit/brands; pass the brand")
