# Maple Garden Skincare, Meditation & Wellbeing — Website

Plain static HTML/CSS/JS site, plus one small Cloudflare Worker route for proxying the Google Reviews API call. No build step, no framework for the site itself.

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
src/worker.js                Cloudflare Worker entry point — handles /api/google-reviews, otherwise serves static assets
wrangler.jsonc                Worker config: entry point, compatibility date, static assets binding
```

## Hosting

Live on **Cloudflare Workers** (with static assets) at `https://maplegardenwellbeing.co.uk/`, deployed via **Workers Builds** — Cloudflare's git-connected CI/CD, installed as a GitHub App on https://github.com/krogarth1/maple-garden-website. Push to `main` and the live site rebuilds and deploys within a minute or two; build status shows up as a GitHub check run on the commit (linking to the build log in the Cloudflare dashboard).

This is **not** Cloudflare Pages, despite the project living under the "Workers & Pages" section of the dashboard — Pages-specific conventions (a `functions/` directory, auto-discovered routes) do not apply here. Routing and static-asset serving are both defined explicitly in `wrangler.jsonc`:

- `main: src/worker.js` — every request first hits this Worker script. It handles `/api/google-reviews` itself and calls `env.ASSETS.fetch(request)` for everything else.
- `assets.directory: "./"` — serves the repo root as static assets (this is why `.assetsignore` exists — see below).
- `assets.not_found_handling: "404-page"` — serves `404.html` (with a real 404 status) for unmatched routes.

`.assetsignore` in the repo root tells the Worker's static asset bundler which files to exclude from being served as assets (`node_modules`, `.git`, `src` — the Worker's own source — `wrangler.jsonc` itself, etc. — see that file for the full list).

GitHub Pages was used for the initial build only, before the custom domain and Cloudflare setup were in place, and has since been disabled in the repo's Settings → Pages. The `.nojekyll` file is a harmless leftover from that period and isn't needed here, but doesn't hurt anything by staying.

## Before going live — action items

1. **Contact form**: the form on `contact.html` posts to `https://formsubmit.co/maplegardenwellbeing@gmail.com` (a free, no-signup form backend). The **first submission** triggers a confirmation email from FormSubmit to that inbox — click the activation link or all future messages will be silently dropped. Test it once after deploying.
2. **Google Reviews widget**: the "What clients say on Google" section on `index.html` pulls live reviews via `js/google-reviews.js`, which calls `/api/google-reviews` — handled by the Worker (`src/worker.js`), which proxies the Google Places API (New) server-side so the API key never reaches the browser. Set `GOOGLE_PLACES_API_KEY` as a **secret** in the Cloudflare dashboard for this Worker (Settings → Variables and Secrets, for both Production and Preview), then trigger a redeploy for it to take effect. The key needs the Places API (New) enabled in Google Cloud; no HTTP referrer restriction is needed since the key is never client-side, but you can still restrict it to the Places API (New) specifically as defense in depth. The Place ID is set in both `js/google-reviews.js` and `src/worker.js` as `ChIJPUUzaPCve0gRNIxGLjYTn_4` (Maple Garden Skincare, Meditation & Wellbeing). Until the secret is set, the Worker returns a 500 for that route and the widget falls back to the three static testimonials already in the HTML. The Worker also caches the Places API response at Cloudflare's edge for 1 hour, so it isn't re-fetched on every page load. **Important**: an earlier version of this file had the key committed in plaintext — that key is permanently exposed in git history even though it's now removed from the working tree, so it must be revoked/regenerated in Google Cloud Console rather than reused (this was already done once; if the key is ever exposed again, rotate it again rather than reusing it).

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
