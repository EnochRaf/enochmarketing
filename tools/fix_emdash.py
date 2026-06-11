#!/usr/bin/env python3
"""Remove em-dashes from all HTML files.

Rules, in order:
  1. exact-string overrides for cases where comma/colon reads wrong
  2. pricing-table "not included" glyph >—< becomes an en-dash
  3. " — " followed by a lowercase letter becomes ", "  (clause/appositive)
  4. " — " followed by anything else becomes ": "       (label/example intro)
Anything left over is reported so it can be handled by hand.
"""
import glob, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OVERRIDES = [
    ("to Meta — Facebook and Instagram ads.", "to Meta (Facebook and Instagram ads)."),
    ("a month — $1,050 in recurring revenue — every single month",
     "a month, $1,050 in recurring revenue, every single month"),
    ("Jake — Forge CrossFit", "Jake, Forge CrossFit"),
    ("head coach — NOT a generic newsletter", "head coach, NOT a generic newsletter"),
    ("send them my way — I'd love", "send them my way. I'd love"),
    ("Hey Sarah — Marcus mentioned", "Hey Sarah, Marcus mentioned"),
    ("REQUEST SENT — WE\\'LL BE IN TOUCH", "REQUEST SENT. WE\\'LL BE IN TOUCH"),
]

total = 0
for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
    h = open(path, encoding="utf-8").read()
    orig = h
    for old, new in OVERRIDES:
        h = h.replace(old, new)
    h = h.replace("&mdash;", "—").replace("&#8212;", "—").replace("&#x2014;", "—")
    h = h.replace(">—<", ">–<")
    h = re.sub(r" — (?=[a-z])", ", ", h)
    h = re.sub(r"\s*—\s+", ": ", h)
    left = h.count("—")
    if left:
        for m in re.finditer(r".{40}—.{40}", h, re.S):
            print("LEFTOVER", os.path.basename(path), repr(m.group(0)))
    if h != orig:
        n = orig.count("—") - left
        total += n
        open(path, "w", encoding="utf-8").write(h)
        print(f"updated {os.path.basename(path)}: {n} removed, {left} left")
print("total removed:", total)
