# SEO Enhancement Proposal

## Goal

Improve search discovery and indexing quality for published `/lyrictor/:publishedId` pages, especially for projects tied to recognizable songs and artists, without changing the editor experience.

## Current State

### What already works

- Published pages have a dedicated route: `/lyrictor/:publishedId`.
- Vercel rewrites published page requests through `api/lyrictor-meta.js`.
- The metadata endpoint injects page-specific:
  - `<title>`
  - description
  - canonical URL
  - Open Graph tags
  - Twitter tags
- Metadata can already include project name, song name, artist name, creator username, and album art.

### Current limitations

1. Published pages are not listed in the sitemap.
2. Internal discovery relies heavily on client-side navigation instead of crawl-friendly anchor links.
3. Published pages mostly ship as app-shell HTML plus metadata, not meaningful server-rendered body content.
4. Published URLs are opaque IDs, which is acceptable but not ideal for search context.
5. Over-optimizing around song terms without original page value could create thin-content and copyright-risk issues.

## Highest-Impact Opportunities

### 1. Dynamic sitemap for published pages

Priority: Highest

Why it matters:
- Search engines should be explicitly told which published pages exist.
- This is the cleanest crawl-discovery gap in the current setup.

Proposal:
- Add a dynamic sitemap endpoint that includes:
  - homepage
  - core public pages
  - all published `/lyrictor/:publishedId` pages
  - optional profile pages when appropriate
- Point `/sitemap.xml` to this generated output.

Expected impact:
- Faster discovery of published pages
- Better crawl coverage for newly published projects

### 2. Replace key JS-only published navigation with real links

Priority: High

Why it matters:
- Crawlers understand `<a href="...">` much more reliably than click handlers with `navigate(...)`.
- Real links also improve shareability, accessibility, and open-in-new-tab behavior.

Proposal:
- Use anchor links or router links for published project destinations in:
  - profile published project rows
  - project cards where a published project can be opened publicly
- Keep existing click behavior where needed, but ensure the DOM exposes real `href`s.

Expected impact:
- Better crawl path discovery
- More resilient linking behavior

### 3. Strengthen published-page metadata templates

Priority: High

Why it matters:
- The metadata is already dynamic, but it can be made more explicit and more search-useful.

Proposal:
- Standardize title patterns like:
  - `{projectName} • {songName} • {artistName} | Lyrictor`
  - fallback: `{projectName} | Lyrictor`
- Standardize descriptions like:
  - `A lyric video interpretation of {songName} by {artistName}, created on Lyrictor by @{username}.`
- Include stronger fallback logic when song or artist is missing.
- Ensure canonical tags always point to the public published URL.

Expected impact:
- Better snippet quality in search results
- Better keyword alignment for song + artist + creator searches

### 4. Add server-rendered descriptive body content

Priority: High

Why it matters:
- Metadata alone helps, but search engines tend to perform better when the initial HTML contains meaningful page text.

Proposal:
- Inject a small server-rendered content block into the published page HTML containing:
  - project name
  - song name
  - artist name
  - creator username
  - short description like “Published lyric video preview on Lyrictor”
- Keep this subtle and compatible with the immersive page design.
- This should not create visible UI chrome or clash with the existing front-end experience.

Expected impact:
- Stronger indexing confidence
- Better relevance for page-specific queries

### 5. Add slugged URLs later

Priority: Medium

Why it matters:
- Slugs can improve readability and slightly improve query association.
- This is lower priority than sitemap, links, and body content.

Proposal:
- Support a route like:
  - `/lyrictor/:publishedId/:slug`
- Continue resolving by `publishedId`; treat the slug as decorative and canonicalized.

Expected impact:
- Cleaner shareable URLs
- Minor SEO upside

## Recommendation Order

Implement in this order:

1. Dynamic sitemap for published pages
2. Crawlable anchor links to published pages
3. Stronger metadata templates
4. Server-rendered descriptive body content
5. Optional slugged URLs

## Content Strategy Guidance

If the goal is to benefit from searches around popular songs, the page should provide original value beyond just naming the song.

Recommended signals:
- creator attribution
- visual interpretation context
- project title and artwork
- public preview framing
- optional user-written description in the future

Avoid relying on:
- full lyric dumps
- thin pages that only repeat song and artist names
- metadata that implies the page is an official lyrics source

## Risks and Constraints

### Copyright risk

- Pages centered on popular songs need to avoid looking like lyric-republication pages.
- Search visibility should come from original creative presentation, not copied lyrics.

### Thin-content risk

- A page with only a title tag and a JS player may still index, but often underperforms.
- Adding a small amount of meaningful server-rendered text reduces this risk.

### Implementation constraint

- The editor and published immersive UI should not be regressed by SEO changes.
- SEO enhancements should be isolated to published-page delivery and public page navigation.

## Suggested Next Build Scope

### Minimal high-impact phase

- Build a dynamic sitemap endpoint for published projects.
- Convert public published-project navigation to real links.
- Tighten metadata wording in `api/lyrictor-meta.js`.

### Follow-up phase

- Add server-rendered descriptive content for published pages.
- Evaluate slugged URLs.

## Success Criteria

- Published pages appear in sitemap output.
- Published pages are reachable through crawlable internal links.
- Search crawlers receive unique metadata for each published page.
- Published pages expose meaningful initial HTML content beyond the generic app shell.
- SEO improvements do not alter or degrade the editor UX.