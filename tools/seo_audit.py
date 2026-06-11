#!/usr/bin/env python3
"""SEO audit for enochmarketing.com static site.

Checks every HTML page in the repo root against the completion criteria:
  T  exactly one <title>, 50-60 chars
  D  meta description 140-160 chars
  C  correct absolute canonical URL
  H1 exactly one <h1>
  OG complete Open Graph + Twitter tags
  LD at least one JSON-LD block that parses
  IX zero internal links to index.html
  SP zero image filenames containing spaces
  AL zero <img> missing alt
  GTM GTM-MHK9XF2Z present
  EM zero em-dashes in visible copy
  LK every internal link resolves to a file in the repo
  SM page listed in sitemap.xml

Usage: python3 tools/seo_audit.py [--verbose]
Exit code 0 if all pages pass all checks, 1 otherwise.
"""
import glob
import json
import os
import re
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAIN = "https://www.enochmarketing.com"
GTM_ID = "GTM-MHK9XF2Z"

OG_REQUIRED = ["og:title", "og:description", "og:url", "og:image", "og:type"]
TW_REQUIRED = ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titles = []          # list of title text
        self.h1s = []
        self.metas = {}           # name/property -> content
        self.canonical = None
        self.links = []           # href of <a>
        self.imgs = []            # dicts of attrs
        self.jsonld = []          # raw script contents
        self.visible_text = []    # text nodes outside script/style/head-meta
        self.videos = []
        self.scripts_render_blocking = []
        self.stylesheets = []
        self._stack = []
        self._in_jsonld = False
        self._in_title = False
        self._title_buf = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self._stack.append(tag)
        if tag == "title":
            self._in_title = True
            self._title_buf = []
        elif tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.metas[key.lower()] = a.get("content", "")
        elif tag == "link":
            if a.get("rel", "").lower() == "canonical":
                self.canonical = a.get("href")
            if a.get("rel", "").lower() == "stylesheet":
                self.stylesheets.append(a)
        elif tag == "a":
            if "href" in a:
                self.links.append(a["href"])
        elif tag == "img":
            self.imgs.append(a)
        elif tag == "video":
            self.videos.append(a)
        elif tag == "script":
            if a.get("type", "").lower() == "application/ld+json":
                self._in_jsonld = True
                self._jsonld_buf = []
            elif a.get("src") and "async" not in a and "defer" not in a:
                self.scripts_render_blocking.append(a.get("src"))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self._stack.pop()

    def handle_endtag(self, tag):
        if tag == "title" and self._in_title:
            self.titles.append("".join(self._title_buf).strip())
            self._in_title = False
        if tag == "script" and self._in_jsonld:
            self.jsonld.append("".join(self._jsonld_buf))
            self._in_jsonld = False
        while self._stack and self._stack[-1] != tag:
            self._stack.pop()
        if self._stack:
            self._stack.pop()

    def handle_data(self, data):
        if self._in_title:
            self._title_buf.append(data)
        elif self._in_jsonld:
            self._jsonld_buf.append(data)
        elif self._stack and self._stack[-1] not in ("script", "style", "noscript"):
            if data.strip():
                self.visible_text.append(data)
        if self._stack and self._stack[-1] == "h1":
            pass

    # h1 counting needs nesting awareness; simpler: count via regex outside parser


def internal_target(href):
    """Return repo-relative target for an internal href, or None if external/anchor."""
    if not href:
        return None
    href = href.strip()
    if href.startswith(("http://", "https://")):
        if href.startswith(DOMAIN):
            href = href[len(DOMAIN):]
        elif href.startswith("https://enochmarketing.com"):
            href = href[len("https://enochmarketing.com"):]
        else:
            return None
    if href.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    href = href.split("#")[0].split("?")[0]
    if not href or href == "/":
        return "index.html"
    return href.lstrip("/")


def check_page(path, sitemap_urls):
    fn = os.path.basename(path)
    with open(path, encoding="utf-8") as f:
        html = f.read()
    p = PageParser()
    p.feed(html)

    results = {}
    notes = []

    # T: exactly one title 50-60 chars
    t_ok = len(p.titles) == 1 and 50 <= len(p.titles[0]) <= 60
    results["title"] = t_ok
    if not t_ok:
        notes.append(f"title count={len(p.titles)} len={[len(t) for t in p.titles]} {p.titles!r}")

    # D: meta description 140-160
    desc = p.metas.get("description", "")
    d_ok = 140 <= len(desc) <= 160
    results["desc"] = d_ok
    if not d_ok:
        notes.append(f"meta description len={len(desc)}: {desc!r}")

    # C: canonical
    expected = DOMAIN + "/" if fn == "index.html" else f"{DOMAIN}/{fn}"
    c_ok = p.canonical == expected
    results["canonical"] = c_ok
    if not c_ok:
        notes.append(f"canonical={p.canonical!r} expected={expected!r}")

    # H1: exactly one (regex on html, excluding comments)
    body = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    h1_count = len(re.findall(r"<h1[\s>]", body))
    results["h1"] = h1_count == 1
    if h1_count != 1:
        notes.append(f"h1 count={h1_count}")

    # OG/TW
    missing = [k for k in OG_REQUIRED + TW_REQUIRED if not p.metas.get(k)]
    results["og_tw"] = not missing
    if missing:
        notes.append(f"missing og/tw: {missing}")

    # LD: at least one JSON-LD that parses
    parsed = 0
    for block in p.jsonld:
        try:
            json.loads(block)
            parsed += 1
        except json.JSONDecodeError as e:
            notes.append(f"JSON-LD parse error: {e}")
    results["jsonld"] = parsed >= 1 and parsed == len(p.jsonld)
    if not p.jsonld:
        notes.append("no JSON-LD blocks")

    # IX: zero internal links to index.html
    idx_links = [h for h in p.links if internal_target(h) == "index.html" and
                 "index.html" in h]
    results["no_index_links"] = not idx_links
    if idx_links:
        notes.append(f"links to index.html: {idx_links}")

    # SP: zero image filenames containing spaces (src attributes)
    spaced = [i.get("src", "") for i in p.imgs if " " in (i.get("src") or "") or "%20" in (i.get("src") or "")]
    results["img_spaces"] = not spaced
    if spaced:
        notes.append(f"img src with spaces: {spaced}")

    # AL: zero img missing alt
    noalt = [i.get("src", "?") for i in p.imgs if "alt" not in i]
    results["alt"] = not noalt
    if noalt:
        notes.append(f"img missing alt: {noalt}")

    # GTM
    results["gtm"] = GTM_ID in html
    if not results["gtm"]:
        notes.append("GTM container missing")

    # EM: zero em-dashes in visible copy (also check title/meta desc/og text)
    em_visible = [t.strip()[:80] for t in p.visible_text if "—" in t]
    em_meta = [f"{k}: {v[:60]}" for k, v in p.metas.items() if "—" in v]
    em_title = [t for t in p.titles if "—" in t]
    results["emdash"] = not (em_visible or em_meta or em_title)
    if not results["emdash"]:
        notes.append(f"em-dashes in: {(em_visible + em_meta + em_title)[:5]}")

    # LK: internal links resolve
    broken = []
    for h in p.links:
        tgt = internal_target(h)
        if tgt and not os.path.exists(os.path.join(ROOT, tgt)):
            broken.append(h)
    results["links_resolve"] = not broken
    if broken:
        notes.append(f"broken internal links: {sorted(set(broken))}")

    # SM: in sitemap
    url = DOMAIN + "/" if fn == "index.html" else f"{DOMAIN}/{fn}"
    results["sitemap"] = url in sitemap_urls
    if not results["sitemap"]:
        notes.append(f"not in sitemap: {url}")

    # ---- advisory (not in pass/fail table) ----
    advisory = []
    lazy_missing = [i.get("src", "?") for i in p.imgs if i.get("loading") != "lazy"
                    and "hero" not in (i.get("src") or "") and "logo" not in (i.get("src") or "")
                    and "facebook.com/tr" not in (i.get("src") or "")]  # noscript tracking pixel
    if lazy_missing:
        advisory.append(f"imgs without loading=lazy: {lazy_missing}")
    for v in p.videos:
        if "poster" not in v:
            advisory.append(f"video missing poster: {v.get('src') or v}")
        if v.get("preload") not in ("none", "metadata"):
            advisory.append(f"video preload={v.get('preload')!r}")
    if p.scripts_render_blocking:
        advisory.append(f"render-blocking scripts: {p.scripts_render_blocking}")

    return results, notes, advisory


def main():
    verbose = "--verbose" in sys.argv
    with open(os.path.join(ROOT, "sitemap.xml"), encoding="utf-8") as f:
        sitemap_urls = set(re.findall(r"<loc>(.*?)</loc>", f.read()))

    pages = sorted(glob.glob(os.path.join(ROOT, "*.html")))
    cols = ["title", "desc", "canonical", "h1", "og_tw", "jsonld", "no_index_links",
            "img_spaces", "alt", "gtm", "emdash", "links_resolve", "sitemap"]
    all_ok = True
    print(f"{'page':<46}" + "".join(f"{c[:8]:<10}" for c in cols))
    for path in pages:
        results, notes, advisory = check_page(path, sitemap_urls)
        row = os.path.basename(path)
        line = f"{row:<46}" + "".join(f"{'PASS' if results[c] else 'FAIL':<10}" for c in cols)
        print(line)
        if not all(results.values()):
            all_ok = False
        if (verbose or not all(results.values())) and notes:
            for n in notes:
                print(f"    ! {n}")
        if verbose and advisory:
            for a in advisory:
                print(f"    ~ {a}")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
