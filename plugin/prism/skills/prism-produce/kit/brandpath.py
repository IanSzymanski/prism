"""Where brands live, for the Python tools (the same rules as resolve.js): shipped brands in kit/brands, onboarding drafts in
the workspace's .prism/brands (PRISM_DRAFTS overrides). A draft wins over a shipped brand of the same id and is never the default."""
import json, os, sys

KIT = os.path.dirname(os.path.abspath(__file__))
SHIPPED = os.path.join(KIT, "brands")
DRAFTS = os.environ.get("PRISM_DRAFTS") or os.path.join(os.path.dirname(KIT), ".prism", "brands")


def brand_dir(bid):
    """The folder holding a brand's profile.json: the workspace draft when there is one, else the shipped brand."""
    d = os.path.join(DRAFTS, bid)
    return d if os.path.exists(os.path.join(d, "profile.json")) else os.path.join(SHIPPED, bid)


def default_brand():
    """The shipped profile marked "default": true (or the only brand shipped)."""
    ids = sorted(b for b in os.listdir(SHIPPED) if os.path.exists(os.path.join(SHIPPED, b, "profile.json")))
    marked = [b for b in ids if json.load(open(os.path.join(SHIPPED, b, "profile.json"))).get("default") is True]
    if len(marked) == 1: return marked[0]
    if not marked and len(ids) == 1: return ids[0]
    sys.exit("no single brand is marked \"default\": true in kit/brands; pass the brand")
