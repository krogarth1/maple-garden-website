# Maple Garden Skincare, Meditation & Wellbeing — Website

Plain static HTML/CSS/JS site. No build step, no framework — deploy by uploading the files as-is.

## Structure

```
index.html                 Home
treatments-services.html   Full treatment menu & prices
about.html                 Andrea's story & qualifications
contact.html                Contact details + booking enquiry form
404.html                   Custom not-found page
css/style.css               All styling (sage/cream/terracotta palette)
js/script.js                 Mobile nav toggle only
images/favicon.png, apple-touch-icon.png, og-cover.jpg   Generated from images/raw/logo/logo.jpg via scripts/build-logo-assets.js
images/logo/brand-icon.webp  Icon-only crop of the logo, used in the header
robots.txt, sitemap.xml     SEO crawling files
```

## Hosting

Currently deployed on **GitHub Pages** at `https://krogarth1.github.io/maple-garden-website/`, built automatically from the `main` branch of https://github.com/krogarth1/maple-garden-website. Push to `main` and the live site updates within a minute or two.

A `.nojekyll` file sits in the repo root — GitHub Pages runs Jekyll by default, which ignores files/folders starting with `_` and can interfere with a plain static site; `.nojekyll` disables that processing.

### Moving to the custom domain (maplegardenwellbeing.co.uk) later

1. In the repo on github.com: **Settings → Pages → Custom domain**, enter `www.maplegardenwellbeing.co.uk` (this creates a `CNAME` file in the repo for you — or add one manually with that single line).
2. At your domain registrar, add a `CNAME` record for `www` pointing to `krogarth1.github.io`, and either an `A`/`ALIAS` record for the root domain to GitHub's Pages IPs (see GitHub's docs) or a redirect from the root to `www`.
3. **Important**: once the custom domain is live, run a find-and-replace across all `.html`, `robots.txt`, and `sitemap.xml` swapping `https://krogarth1.github.io/maple-garden-website/` back to `https://www.maplegardenwellbeing.co.uk/` — the canonical/Open Graph/JSON-LD tags currently point at the GitHub Pages URL since that's what's actually serving the content today.

## Before going live — action items

1. **Contact form**: the form on `contact.html` posts to `https://formsubmit.co/maplegardenwellbeing@gmail.com` (a free, no-signup form backend). The **first submission** triggers a confirmation email from FormSubmit to that inbox — click the activation link or all future messages will be silently dropped. Test it once after deploying.
2. **Exact address**: only "Urmston, Manchester, M41" is used throughout (matching what's public today) since the full street address wasn't available to me. Add it to the `PostalAddress` JSON-LD blocks in each page's `<head>` and to `contact.html` once you're happy publishing it — this meaningfully helps local SEO ("Urmston massage therapist" etc.) and Google Maps accuracy.
3. **Custom domain**: see "Moving to the custom domain" above — canonical URLs, Open Graph tags and `sitemap.xml` currently point at the GitHub Pages URL, not `maplegardenwellbeing.co.uk`.
4. **Google Reviews widget**: the "What clients say on Google" section on `index.html` pulls live reviews via `js/google-reviews.js`, which calls the Google Places API (New). Set `GOOGLE_PLACES_API_KEY` at the top of that file to a Google Cloud API key with the Places API (New) enabled and restricted (HTTP referrers) to this site's domain(s). The Place ID is already set to `ChIJPUUzaPCve0gRNIxGLjYTn_4` (Maple Garden Skincare, Meditation & Wellbeing). Until a key is added, the section falls back to the three static testimonials already in the HTML.

## SEO already built in

- Unique, keyword-targeted `<title>` and meta description per page (e.g. "Massage & Wellbeing Therapist in Urmston").
- `HealthAndBeautyBusiness` JSON-LD structured data (name, address, phone, email, socials, services) on the homepage, plus `Person` schema for Andrea on the About page and `BreadcrumbList` schema on inner pages — helps Google show rich results.
- Semantic HTML5 (`header`/`nav`/`main`/`article`/`footer`, one `<h1>` per page, logical heading order).
- `robots.txt` + `sitemap.xml` for crawling/indexing.
- Fast by default: no JS framework, no render-blocking scripts, system-first font stack with `font-display: swap`, minimal CSS/JS payload.
- Mobile-responsive (flexbox/grid, hamburger nav under 860px).
- Canonical tags to avoid duplicate-content issues.

## Recommended next SEO steps (outside the code)

1. Set up and verify a **Google Business Profile** for Urmston — this matters more than the website itself for local "near me" searches.
2. Submit `sitemap.xml` in **Google Search Console** once live.
3. Get listed on local directories (Bark, Treatwell, Fresha if taking bookings, local Urmston/Trafford business listings) — each is a backlink and a trust signal.
4. Ask happy clients for **Google reviews** — review count/rating is a major local ranking factor for this kind of business.
5. Once you have real photos, add descriptive `alt` text (e.g. `alt="Hot stone massage treatment room at Maple Garden, Urmston"`) — currently all icons are decorative SVGs marked `aria-hidden`, so there's nothing to fix there yet, but real photos will need alt text.

## Editing content

Everything is plain HTML — open any `.html` file in a text editor and edit directly. Treatment prices/descriptions live in `treatments-services.html` inside `<div class="treatment-item">` blocks; update both the visible text and the matching entry in the JSON-LD block on `index.html` if a *named* service changes significantly.
