#!/usr/bin/env python3
"""Add missing Twitter card tags (mirrors OG values) and free-audit head tags."""
import glob, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOMAIN = "https://www.enochmarketing.com"


def get(h, prop):
    m = re.search(r'<meta (?:property|name)="%s" content="(.*?)"' % re.escape(prop), h)
    return m.group(1) if m else None


for path in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
    fn = os.path.basename(path)
    h = open(path, encoding="utf-8").read()
    orig = h

    if fn == "free-audit.html":
        desc = get(h, "description")
        title = re.search(r"<title>(.*?)</title>", h).group(1)
        block = f'''    <link rel="canonical" href="{DOMAIN}/free-audit.html" />
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Enoch Marketing">
    <meta property="og:url" content="{DOMAIN}/free-audit.html">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{desc}">
    <meta property="og:image" content="{DOMAIN}/logo-enoch.png">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{desc}">
    <meta name="twitter:image" content="{DOMAIN}/logo-enoch.png">
'''
        h = h.replace('    <meta name="description" content="%s">\n' % desc,
                      '    <meta name="description" content="%s">\n' % desc + block, 1)
    else:
        if get(h, "og:title") and not get(h, "twitter:card"):
            ogt, ogd, ogi = get(h, "og:title"), get(h, "og:description"), get(h, "og:image")
            tw = (f'    <meta name="twitter:card" content="summary_large_image">\n'
                  f'    <meta name="twitter:title" content="{ogt}">\n'
                  f'    <meta name="twitter:description" content="{ogd}">\n'
                  f'    <meta name="twitter:image" content="{ogi}">\n')
            # insert after the last og: meta line
            metas = list(re.finditer(r'[ \t]*<meta property="og:[^"]+" content="[^"]*">\n', h))
            last = metas[-1]
            h = h[:last.end()] + tw + h[last.end():]
        if get(h, "twitter:card") and not get(h, "twitter:image"):
            ogi = get(h, "og:image") or f"{DOMAIN}/logo-enoch.png"
            m = list(re.finditer(r'[ \t]*<meta name="twitter:[^"]+" content="[^"]*">\n', h))[-1]
            h = h[:m.end()] + f'    <meta name="twitter:image" content="{ogi}">\n' + h[m.end():]

    if h != orig:
        open(path, "w", encoding="utf-8").write(h)
        print("updated", fn)
print("done")
