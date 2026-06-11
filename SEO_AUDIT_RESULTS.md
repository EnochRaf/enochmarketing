# SEO Audit Results: enochmarketing.com

Audit date: 2026-06-11. Scope: all 20 HTML pages in the repo, sitemap.xml, robots.txt, vercel.json, and every referenced asset. Tooling: `tools/seo_audit.py` (re-runnable; exits 0 only when every page passes every check).

## Summary

The audit found 7 categories of fixable issues. All of them are now fixed in code and committed. Items that cannot be fixed in this repo (hosting, Search Console, off-site) are listed in `MANUAL_TODO.md`.

| # | Finding | Pages affected | Status |
|---|---------|----------------|--------|
| 1 | Titles outside 50-60 chars (39 to 100 chars) | 16 | Fixed |
| 2 | Meta descriptions outside 140-160 chars (146 to 216) | 16 | Fixed |
| 3 | Missing Twitter card tags; free-audit missing canonical + all social tags | 13 | Fixed |
| 4 | Missing JSON-LD (blog index, free-audit, pricing-strategy article) | 3 | Fixed |
| 5 | 566 em-dashes in visible copy and metadata | 20 | Fixed |
| 6 | Meta pixel noscript image missing alt; hero videos missing poster | 20 / 3 | Fixed |
| 7 | sitemap.xml missing 11 of 20 pages | n/a | Fixed |
| 8 | 10 content photos served at 6-20MB originals | 3 | Fixed |

## Detailed findings and fixes

### 1. Titles
16 pages had titles outside the 50-60 character window, from 39 chars (free-audit) to 100 chars (the 30-day article). Two titles contained em-dashes. All titles rewritten to 50-60 chars in brand voice, keeping the `| Enoch Marketing` suffix and each page's primary keyword. Every page has exactly one `<title>` tag.

### 2. Meta descriptions
16 pages were outside the 140-160 character window (up to 216 chars on the pricing-strategy article). Several contained em-dashes; pricing.html's contained the banned word "guarantee" (now "money-back promise"). All rewritten to 140-160 chars, direct and confident, no banned words.

### 3. Canonicals, Open Graph, Twitter cards
- Every page already had a correct absolute canonical except free-audit.html, which had none. Added.
- 12 article pages had Open Graph but zero Twitter card tags; the pricing-strategy article was missing only `twitter:image`. Added `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` mirroring each page's OG values.
- free-audit.html gained a complete OG + Twitter block.
- blog.html's og:title/twitter:title aligned with its new page title.

### 4. Structured data (JSON-LD)
Already present: Organization (index), LocalBusiness-style blocks (about, services, contact), FAQPage (pricing), Article + BreadcrumbList + Person author on 12 articles. Added:
- blog.html: `Blog` + `BreadcrumbList`
- free-audit.html: `WebPage` + `BreadcrumbList`
- gym-membership-pricing-strategy.html: `Article` (author + publisher) + `BreadcrumbList`, matching the visible byline "By Enoch Marketing"

All JSON-LD on all pages parses without errors. FAQPage exists only where the page has real FAQ content (pricing.html).

### 5. Em-dashes
566 em-dashes removed across all 20 pages, including one `&mdash;` entity on pricing.html. Replacement rules: clause continuations became commas, label/example introductions became colons, seven hand-tuned cases (parenthetical, quoted speech, paired dashes), and the pricing table's "not included" glyph became an en-dash. No other copy wording was changed.

A follow-up proofread of every replacement site (old text vs. new, from git history) found 35 spots where the comma created a run-on between two independent clauses; those were upgraded to a period or colon. Punctuation and sentence-start capitalization only, still no wording changes.

### 6. Heading structure, images, video, render-blocking
- Every page has exactly one `<h1>`; h2/h3 nesting is sound.
- All content images already had descriptive alt text and `loading="lazy"`. The Meta pixel noscript `<img>` lacked alt on all 20 pages; it now carries `alt=""`.
- No image filename (file on disk or referenced src) contains spaces. The two logo files with spaces were renamed in the baseline commit.
- All three hero videos (`index`, `services`, `about`) already used `preload="metadata"`; none had a poster. Real first-frame posters extracted at 1600px (the services frame taken at 1.5s to skip a black fade-in) and wired in, so heroes paint before video bytes arrive.
- No render-blocking scripts: GTM and gtag load async. The Google Fonts stylesheet is technically render-blocking but already mitigated with `preconnect` and `display=swap`; self-hosting fonts is listed as an optional manual improvement.

### 7. Sitemap and robots
- sitemap.xml listed only 9 of 20 pages and carried stale lastmod dates. Regenerated with all 20 URLs (`tools/build_sitemap.py`), lastmod from git history, index/blog/free-audit prioritized.
- robots.txt is correct: allows all crawlers and points to the sitemap. Unchanged.
- vercel.json already 301s `/index.html` to `/`; zero internal links anywhere point to index.html (they use `/`).

### 8. Performance (image weight)
services.html, about.html, and free-audit.html served ten photos at original camera resolution (5078px wide, 6-20MB each; worst case 19.7MB). Recompressed in place to 1920px max width (~200-600KB each, same filenames and aspect ratios) and synced the `width`/`height` attributes; free-audit images gained explicit dimensions to prevent layout shift.

## Verification

`python3 tools/seo_audit.py` checks every page for: exactly one 50-60 char title; 140-160 char meta description; correct absolute canonical; exactly one h1; complete OG + Twitter tags; at least one valid JSON-LD block; zero links to index.html; zero image srcs with spaces; zero imgs missing alt; GTM-MHK9XF2Z present; zero em-dashes in visible copy or metadata; every internal link resolving to a repo file; presence in sitemap.xml. All 20 pages pass all 13 checks.
