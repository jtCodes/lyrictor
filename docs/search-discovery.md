# Google Search discovery

Public `/lyrictor/:publishedId` pages serve project-specific titles, descriptions, canonical URLs, social metadata, and valid CreativeWork structured data before JavaScript runs. Existing tab titles and the visible interface are unchanged. The malformed JSON-LD encoding is corrected, and the old offscreen SEO-only summary is removed; crawlers can read the project information rendered by the app.

Only demo projects and documents in the public Firestore `published` collection are included in `/sitemap.xml`. Private saved projects are not queried. Local previews are marked `noindex`; missing published projects return 404 and temporary backend failures return 503. Editor and auth routes carry `X-Robots-Tag: noindex, follow` on Vercel. Canonical URLs and the sitemap use `https://lyrictor.com`.

## Deployment and indexing

1. Deploy the web build and `api` functions using the repository's Vercel configuration. Vite's development server alone does not serve the project metadata functions.
2. Ensure `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_API_KEY` are available to the server functions, and deployed Firestore rules allow public reads of `published`. Keep Vercel preview deployment protection enabled to avoid indexing preview hosts.
3. Verify the `lyrictor.com` domain property in [Google Search Console](https://search.google.com/search-console), using its DNS verification record.
4. Submit `https://lyrictor.com/sitemap.xml`. Use URL Inspection on the homepage and the published project URL, run the live test, inspect the rendered page, then request indexing.
5. Review Page indexing and Performance over time. A valid sitemap and metadata enable discovery; they do not guarantee indexing or ranking for a query.

For the IVE example, the live sitemap checked on September 8, 2026 already included:

`https://lyrictor.com/lyrictor/LtjcN4GBYihnsK0EjNgm3TnweOy1_IVE%20-%20BLACKHOLE`

Its existing title remains `BLACKHOLE • IVE | Lyrictor`. Populate accurate Song and Artist values, then publish/update the project to expose changes publicly. Unpublishing removes its document and sitemap entry; Google's existing listing may take time to disappear.

## Verification

Run `node scripts/tests/seo.cjs` and `yarn build:web`. The SEO checks exercise handler responses with mocked public Firestore data, including script-injection escaping, missing projects, backend failures, local previews, and canonical sitemap URLs. Inspect production responses after deployment because local unit checks cannot establish Vercel configuration or Google indexing.

Google's guidance: [JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
