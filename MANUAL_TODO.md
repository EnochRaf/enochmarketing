# Manual SEO To-Dos (not fixable in this repo)

These items need action in hosting dashboards, third-party platforms, or asset production. Each is satisfied for the audit by being documented here.

## Hosting / Vercel
1. **Force one canonical host.** Canonicals and the sitemap use `https://www.enochmarketing.com`. In the Vercel domain settings, make sure `enochmarketing.com` (apex) 301-redirects to `www.enochmarketing.com`, and HTTP to HTTPS. The repo can only redirect paths, not hosts.
2. **Confirm the videos deploy.** `*.mp4` is gitignored, so `hero-bg-new.mp4`, `services-hero.mp4`, and `about-hero.mp4` are not in git. Verify they exist in the production deployment (they upload from the local folder today). If a video 404s, the new poster frames keep the heroes looking right.
3. **Optional, later: clean URLs.** Vercel's `cleanUrls` would serve `/pricing` instead of `/pricing.html`. Skipped on purpose: the goal forbids changing existing page URLs. If ever enabled, update canonicals, sitemap, and internal links in the same release.

## Google / Bing
4. **Search Console:** verify the property for `www.enochmarketing.com`, submit `https://www.enochmarketing.com/sitemap.xml`, and request indexing for the 11 pages that were missing from the old sitemap.
5. **Bing Webmaster Tools:** same sitemap submission.
6. **Google Business Profile:** the site's LocalBusiness/Organization schema is in place; keep the GBP name, address, and URL consistent with it (the local SEO article's own advice).

## Assets / content
7. **Real social share image.** og:image and twitter:image currently use the logo (`logo-enoch.png`). A dedicated 1200x630 photo card per key page (or at least one site-wide) will look far better in feeds. Needs design work.
8. **Author bylines.** The pricing-strategy article is bylined "By Enoch Marketing" while the other 12 articles credit Collin Charles. Decide one way and update the byline plus Article schema together.
9. **Self-host fonts (optional perf).** The Google Fonts stylesheet is the last render-blocking resource. Already mitigated with preconnect + display=swap; self-hosting the two families would remove the third-party request entirely.
10. **Body copy that says "guarantee".** pricing.html's visible copy includes "100% money-back guarantee" wording. The audit constraint forbids rewriting existing visible copy, and "guarantee" is on the banned-words list for new copy only, so it stands. Flagging it here in case you want the wording changed; the meta description already says "money-back promise".

## Off-site
11. **Backlinks and citations.** Build local citations (Yelp, CrossFit affiliate directories, local business listings) with NAP matching the schema, and pursue links from fitness/CrossFit publications. Nothing in the repo can do this.
