#!/usr/bin/env python3
"""Insert JSON-LD into blog.html, free-audit.html, gym-membership-pricing-strategy.html."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = "https://www.enochmarketing.com"

def crumbs(*items):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u}
            for i, (n, u) in enumerate(items)
        ],
    }

BLOCKS = {
    "blog.html": [
        {
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "Enoch Marketing Gym Marketing Blog",
            "description": "Marketing strategies, frameworks, and playbooks for CrossFit gym owners who want more members through the door.",
            "url": f"{D}/blog.html",
            "publisher": {
                "@type": "Organization",
                "name": "Enoch Marketing",
                "url": f"{D}/",
                "logo": {"@type": "ImageObject", "url": f"{D}/enoch-logo.png"},
            },
        },
        crumbs(("Home", f"{D}/"), ("Blog", f"{D}/blog.html")),
    ],
    "free-audit.html": [
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Free Gym Growth Audit for CrossFit Boxes",
            "description": "A free personal video audit of your gym's website, ads, and online presence, delivered as a Loom walkthrough within 48 hours.",
            "url": f"{D}/free-audit.html",
            "publisher": {
                "@type": "Organization",
                "name": "Enoch Marketing",
                "url": f"{D}/",
                "logo": {"@type": "ImageObject", "url": f"{D}/enoch-logo.png"},
            },
        },
        crumbs(("Home", f"{D}/"), ("Free Audit", f"{D}/free-audit.html")),
    ],
    "gym-membership-pricing-strategy.html": [
        {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "How to Price Your Gym Memberships Without Leaving Money on the Table",
            "datePublished": "2026-05-01",
            "author": {
                "@type": "Organization",
                "name": "Enoch Marketing",
                "url": f"{D}/about.html",
            },
            "publisher": {
                "@type": "Organization",
                "name": "Enoch Marketing",
                "logo": {"@type": "ImageObject", "url": f"{D}/enoch-logo.png"},
            },
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": f"{D}/gym-membership-pricing-strategy.html",
            },
            "image": f"{D}/logo-enoch.png",
        },
        crumbs(
            ("Home", f"{D}/"),
            ("Blog", f"{D}/blog.html"),
            ("How to Price Your Gym Memberships", f"{D}/gym-membership-pricing-strategy.html"),
        ),
    ],
}

for fn, blocks in BLOCKS.items():
    path = os.path.join(ROOT, fn)
    h = open(path, encoding="utf-8").read()
    scripts = "".join(
        '    <script type="application/ld+json">\n%s\n    </script>\n'
        % json.dumps(b, indent=4, ensure_ascii=False)
        for b in blocks
    )
    assert "</head>" in h and "application/ld+json" not in h, fn
    h = h.replace("</head>", scripts + "</head>", 1)
    open(path, "w", encoding="utf-8").write(h)
    print("updated", fn)
print("done")
