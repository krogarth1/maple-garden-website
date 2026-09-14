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

Live on **Cloudflare Pages** at `https://maplegardenwellbeing.co.uk/`, deployed automatically from the `main` branch of https://github.com/krogarth1/maple-garden-website via Cloudflare's Git integration. Push to `main` and the live site updates within a minute or two.

`.assetsignore` in the repo root tells Cloudflare Pages which files to exclude from the deploy bundle (`node_modules`, `.git`, `package.json`, etc. — see that file for the full list).

GitHub Pages was used for the initial build only, before the custom domain and Cloudflare setup were in place, and has since been disabled in the repo's Settings → Pages. The `.nojekyll` file is a harmless leftover from that period (it disabled GitHub's Jekyll processing) and isn't needed by Cloudflare Pages, but doesn't hurt anything by staying.

## Before going live — action items

1. **Contact form**: the form on `contact.html` posts to `https://formsubmit.co/maplegardenwellbeing@gmail.com` (a free, no-signup form backend). The **first submission** triggers a confirmation email from FormSubmit to that inbox — click the activation link or all future messages will be silently dropped. Test it once after deploying.
2. **Google Reviews widget**: the "What clients say on Google" section on `index.html` pulls live reviews via `js/google-reviews.js`, which calls `/api/google-reviews` — a Cloudflare Pages Function (`functions/api/google-reviews.js`) that proxies the Google Places API (New) server-side, so the API key never reaches the browser. Set `GOOGLE_PLACES_API_KEY` as a **secret** environment variable in the Cloudflare Pages dashboard (Settings → Environment variables, for both Production and Preview), then trigger a redeploy for it to take effect. The key needs the Places API (New) enabled in Google Cloud; no HTTP referrer restriction is needed since the key is never client-side, but you can still restrict it to the Places API (New) specifically as defense in depth. The Place ID is set in both `js/google-reviews.js` and `functions/api/google-reviews.js` as `ChIJPUUzaPCve0gRNIxGLjYTn_4` (Maple Garden Skincare, Meditation & Wellbeing). Until the secret is set, the function returns a 500 and the widget falls back to the three static testimonials already in the HTML. The function also caches the Places API response at Cloudflare's edge for 1 hour, so it isn't re-fetched on every page load. **Important**: an earlier version of this file had the key committed in plaintext — that key is permanently exposed in git history even though it's now removed from the working tree, so it must be revoked/regenerated in Google Cloud Console rather than reused here.

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
