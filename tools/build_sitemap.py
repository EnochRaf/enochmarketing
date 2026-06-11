#!/usr/bin/env python3
"""Regenerate sitemap.xml from the HTML pages present in the repo root."""
import glob, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAIN = "https://www.enochmarketing.com"

CORE = {"index.html": ("1.0", "weekly"), "services.html": ("0.8", "monthly"),
        "pricing.html": ("0.8", "monthly"), "free-audit.html": ("0.8", "monthly"),
        "about.html": ("0.7", "monthly"), "contact.html": ("0.7", "monthly"),
        "blog.html": ("0.8", "weekly")}
ARTICLE = ("0.7", "monthly")


def lastmod(fn):
    out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", fn],
                         capture_output=True, text=True, cwd=ROOT).stdout.strip()
    return out or "2026-06-11"


pages = sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, "*.html")))
order = [p for p in CORE if p in pages] + [p for p in pages if p not in CORE]

entries = []
for fn in order:
    loc = DOMAIN + "/" if fn == "index.html" else f"{DOMAIN}/{fn}"
    prio, freq = CORE.get(fn, ARTICLE)
    entries.append(f"""  <url>
    <loc>{loc}</loc>
    <lastmod>{lastmod(fn)}</lastmod>
    <changefreq>{freq}</changefreq>
    <priority>{prio}</priority>
  </url>""")

xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n'
       + "\n\n".join(entries) + "\n\n</urlset>\n")
open(os.path.join(ROOT, "sitemap.xml"), "w").write(xml)
print(f"wrote sitemap.xml with {len(entries)} urls")
