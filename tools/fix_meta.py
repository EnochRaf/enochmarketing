#!/usr/bin/env python3
"""Apply title/meta-description rewrites. Asserts length ranges before writing."""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TITLES = {
    "index.html": "Marketing Agency for CrossFit Gyms | Enoch Marketing",
    "pricing.html": "Pricing for CrossFit Gym Marketing | Enoch Marketing",
    "services.html": "Gym Marketing Services for CrossFit Boxes | Enoch Marketing",
    "blog.html": "Gym Marketing Blog for CrossFit Box Owners | Enoch Marketing",
    "free-audit.html": "Free Gym Growth Audit for CrossFit Boxes | Enoch Marketing",
    "blog-analytics.html": "5 Marketing Metrics Every Gym Must Track | Enoch Marketing",
    "blog-branding.html": "CrossFit Gyms Shouldn't Compete on Price | Enoch Marketing",
    "blog-google-ads.html": "Google Ads for Gym Owners: 2026 Framework | Enoch Marketing",
    "blog-meta-ads.html": "Meta Ads for Gyms: Add 20+ Members a Month | Enoch Marketing",
    "blog-retention.html": "The Member Retention Blueprint for Gyms | Enoch Marketing",
    "blog-social-media.html": "Social Media That Gets Gyms New Members | Enoch Marketing",
    "crossfit-30-day-new-member-experience.html": "The 30-Day New Member Experience for Gyms | Enoch Marketing",
    "email-marketing-for-gyms.html": "Email Marketing Playbook for Gym Owners | Enoch Marketing",
    "gym-membership-pricing-strategy.html": "How to Price Your Gym Memberships Right | Enoch Marketing",
    "gym-referral-programs-that-actually-work.html": "Gym Referral Programs That Actually Work | Enoch Marketing",
    "gym-website-costing-members.html": "Why Your Gym's Website Costs You Members | Enoch Marketing",
}

DESCS = {
    "about.html": "Enoch Marketing is a veteran-owned agency built exclusively for CrossFit gyms and fitness brands. Meet the team helping gym owners pack their floors.",
    "blog-analytics.html": "Most gym owners track members and revenue but ignore the upstream metrics that predict them. Know these 5 numbers to stay six weeks ahead of problems.",
    "blog-branding.html": "Low-price gyms are everywhere. Premium boxes with loyal communities are rare. Here is how to position your CrossFit box as the obvious choice at full rates.",
    "blog-google-ads.html": "Google Ads reaches people already searching for a gym in your city. Here is the complete 2026 framework CrossFit gym owners use to turn clicks into sign-ups.",
    "blog-local-seo.html": "Step-by-step local SEO guide for CrossFit gym owners. Google Business Profile, review strategy, citations, and on-page SEO to win CrossFit near me searches.",
    "blog-meta-ads.html": "The five-step Meta Ads framework CrossFit gyms use to add 20+ new members per month, covering audiences, creative, landing pages, follow-up, and retargeting.",
    "blog-retention.html": "Acquiring a new gym member costs five to seven times more than keeping one. Here is how to build retention systems that keep your members training for years.",
    "blog-social-media.html": "The average CrossFit gym spends five hours a week on social media and signs zero members from it. Here is the framework that turns followers into sign-ups.",
    "contact.html": "Book a free 30-minute audit for your gym. We review your ads, website, and member funnel, then hand you a plan to pack your gym. No pitch, no pressure.",
    "crossfit-30-day-new-member-experience.html": "Most CrossFit gyms lose a new member's loyalty in the first 30 days without knowing it. Here is the onboarding framework that turns trial members into lifers.",
    "email-marketing-for-gyms.html": "Instagram can shadowban you overnight and ad prices keep climbing, but your email list is yours. Here is how smart gym owners use email to drive revenue.",
    "gym-membership-pricing-strategy.html": "Most gyms pick a number, copy the box down the street, and call it a day. Pricing is positioning. Here is the framework for prices that reflect real value.",
    "gym-referral-programs-that-actually-work.html": "A free week for a friend is not a referral program, it is a coupon. Here is the framework for a referral system that brings in your highest-quality members.",
    "gym-website-costing-members.html": "Most gym websites look fine but convert terribly. Here's the exact audit framework to find the leaks and fix them without rebuilding your site from scratch.",
    "pricing.html": "Transparent pricing for CrossFit gym marketing. Paid ads, social media, SEO, web design and more. No contracts, no retainers, and a money-back promise.",
    "services.html": "Paid ads, lead generation, local SEO, social media, web design, and brand strategy built for CrossFit gyms. Book a free audit and find what holds your box back.",
}

BANNED = ["leverage", "synergy", "optimize", "holistic", "solutions",
          "engagement", "disrupt", "guarantee", "—"]

ok = True
for fn, t in TITLES.items():
    if not 50 <= len(t) <= 60:
        print(f"TITLE LEN {len(t)}: {fn}: {t}"); ok = False
for fn, d in DESCS.items():
    if not 140 <= len(d) <= 160:
        print(f"DESC LEN {len(d)}: {fn}: {d}"); ok = False
for fn, s in list(TITLES.items()) + list(DESCS.items()):
    for b in BANNED:
        if b in s.lower():
            print(f"BANNED '{b}' in {fn}: {s}"); ok = False
if not ok:
    sys.exit("aborting, fix lengths/words above")

if "--check" in sys.argv:
    print("all lengths and wording OK"); sys.exit(0)

for fn in sorted(set(TITLES) | set(DESCS)):
    path = os.path.join(ROOT, fn)
    h = open(path, encoding="utf-8").read()
    orig = h
    if fn in TITLES:
        h = re.sub(r"<title>.*?</title>", f"<title>{TITLES[fn]}</title>", h, count=1, flags=re.S)
    if fn in DESCS:
        h = re.sub(r'(<meta name="description" content=").*?(">)',
                   lambda m: m.group(1) + DESCS[fn] + m.group(2), h, count=1, flags=re.S)
    if h != orig:
        open(path, "w", encoding="utf-8").write(h)
        print("updated", fn)
print("done")
