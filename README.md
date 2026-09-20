# Neo BookFinder

A frontend-only web app for searching books by title, author or keyword and browsing the results —
covers, authors and publish years — pulled from the free, key-less **Open Library** API. Selecting a
book opens a detail view with a longer description, subjects/genres and publish information.

Built with plain **HTML, CSS and vanilla JavaScript**. No framework, no backend, no database and no
API key: the whole app runs in the browser.

> **Current status — Phase 2 (working app) is complete.**
> The UI is driven by live Open Library data: real searches, real covers, real work records,
> localStorage favorites, filter/sort and Load More pagination all work.
> What is left is the demo video/GIF and the GitHub Pages deploy — see [Roadmap](#roadmap).

---

## Purpose

Book Finder exists to cover the core skills behind almost any frontend or API-driven project —
making HTTP requests, handling asynchronous JSON responses and rendering dynamic UI — in a
beginner-friendly, low-setup way. It starts intentionally simple (one search box and a results grid)
and leaves clear directions to extend.

## Running it locally

There is **no build step, no `npm install` and no configuration**. Two ways to run:

**Option 1 — open the file directly**

Double-click `index.html`, or open it from the browser (`File → Open File…`).

**Option 2 — serve it over HTTP (recommended)**

```bash
cd Book-Finder
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Use this option if your browser blocks local `fetch()` calls on
`file://` URLs — a local server avoids that entirely.

> Both options work. Opening the file directly is fine for a quick look, but Chrome blocks
> `fetch()` from `file://` origins, so searches will fail there. Use Option 2 for the real thing.

Requirements: a modern browser (Chrome, Firefox, Safari or Edge). An internet connection is needed
for the Google Fonts (Fraunces + DM Sans); offline, the layout falls back to the system font stack
and stays intact.

## Pages

| File | What it shows |
|---|---|
| `index.html` | **Discover** — hero + SearchBar, featured pick, results toolbar, ResultsGrid of BookCards, sidebar panels (trending subjects, editor's shelf, favorites), Load More |
| `book-detail.html` | **DetailView** — cover stage, favorite toggle, fact strip, description, subject tags, edition panel |
| `ui-states.html` | **State gallery** — every UI state on one page for review: loading, no results, network error, missing cover, missing description, empty favorites, Load More variants. Static markup, kept as a design reference. |

Opening `book-detail.html` with no `?key` shows the featured Dune record, so the detail page can be
demonstrated on its own. Every link inside the app passes a real work key.

## Components

The four components named in the brief, and where they live:

| Component | Hook | Notes |
|---|---|---|
| **SearchBar** | `#search`, `#search-input`, `#search-button`, `input[name="search-mode"]` | Visible label, native radio segmented control (All / Title / Author). States: default, hover, focus, filled, disabled. |
| **ResultsGrid** | `#results-grid.book-grid` | 1 → 2 → 3 → 4 columns. `.book-grid--list` switches to a list layout. |
| **BookCard** | `.book-card` | 2:3 cover, subject, title (2-line clamp), author, year + edition count, favorite toggle (`aria-pressed`), "View details" link with a stretched hit area. |
| **DetailView** | `.detail`, `#detail` | Two columns ≥1024px, one column below. Ready to be placed inside a `<dialog>`. |

## JavaScript modules

Plain `<script>` files, no bundler and no modules — so the pages still work when opened directly.
Each file attaches to a single `window.NeoBF` namespace.

| File | Responsibility |
|---|---|
| `js/api.js` | The only place that talks to the network. `search()` and `fetchDetail()` wrap `fetch()` with an `AbortController` timeout, and every failure is normalised into a friendly `ApiError`. Also owns `coverUrl()` and the placeholder-cover path. |
| `js/favorites.js` | localStorage read/write (`neobf.favorites.v1`), with an in-memory fallback when storage is blocked. Every write dispatches a `favorites:change` event so the shelf, the badge and the hearts all stay in sync without shared state. |
| `js/render.js` | Pure template functions — no DOM queries, no fetching. BookCard, DetailView, skeletons and every empty/error state, plus `escapeHtml()` on all interpolated text. |
| `js/search.js` | Controller for `index.html`. Owns the state machine (`welcome / empty-input / loading / results / no-results / error`), the filter/sort toolbar, Load More and the URL sync. |
| `js/detail.js` | Controller for `book-detail.html`. Reads `?key=`, loads the work record, rebuilds the breadcrumb and keeps "Back to results" pointing at the search you came from. |

Because the controllers are per-page, `book-detail.html` does not load `search.js` and vice versa.

## Open Library endpoints

These are the endpoints the app calls. All of them are key-less and CORS-enabled
(`access-control-allow-origin: *`).

**Search**

```
https://openlibrary.org/search.json?q={query}
  &fields=key,title,author_name,first_publish_year,cover_i,subject,edition_count
  &limit=24&page=1
```

- `q=` general keyword search (the **All** mode)
- `title=` title-only search (the **Title** mode)
- `author=` author-only search (the **Author** mode)
- `fields=` keeps the payload small — only what the cards actually render
- `page=` + `limit=` drive the **Load More** control

**Covers**

```
https://covers.openlibrary.org/b/id/{cover_i}-M.jpg     # S, M or L
```

A book with no `cover_i` falls back to `assets/book-placeholder.svg`.

**Detail view**

```
https://openlibrary.org/works/{key}.json               # description, subjects
https://openlibrary.org/works/{key}/editions.json      # edition + publish info
```

Documentation: [Search API](https://openlibrary.org/dev/docs/api/search) ·
[Covers API](https://openlibrary.org/dev/docs/api/covers) ·
[MDN — Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)

## UI/UX states

Requirement 3 of the brief asks for a loading indicator, a friendly error message and a responsive
layout. All of them are **live** — driven by real request state, not mockups — and `ui-states.html`
also shows them side by side for review:

1. SearchBar states (default, hover, focus, filled, disabled)
2. Initial welcome state — with suggestion chips that run a search
3. Populated results — real covers, authors and years
4. Search loading — skeleton cards + status line
5. No results found — with a "Clear search" action
6. Network error with a working Retry action
7. Detail loading
8. Missing-cover card (grid and list)
9. Missing-description detail
10. Empty favorites
11. Load More states (default, hover, focus, loading, disabled, end of results)

Accessibility hooks: `#results-status` uses `role="status"` for live announcements, the error state
uses `role="alert"`, the grid/list toggle and favorite buttons use `aria-pressed`, the active nav
link uses `aria-current`, and a skip link is the first focusable element on every page.

## Responsive layout

Breakpoints (min-width): `480` featured card widens · `640` search button moves inline, grid → 3
columns · `768` desktop header, single-row toolbar · `1024` two-column hero, results with sidebar,
two-column detail · `1280` 4-column grid.

Tested at **375, 768, 1024 and 1440px** — see [`screenshots/`](screenshots).

The `live-*.png` files are real captures of the running app against the live API (no mockups):

| Capture | Shows |
|---|---|
| `live-1440-welcome.png` | Welcome state with suggestion chips |
| `live-1440-loading.png` | Loading — skeleton cards + status line |
| `live-1440-results.png` | Populated results with real covers |
| `live-1440-list-view.png` | List layout |
| `live-1440-no-results.png` | No-results state |
| `live-1440-network-error.png` | Network error with Retry |
| `live-1440-detail.png` | Detail view with live work data |
| `live-375-results.png` | Mobile, 375px |

The remaining `desktop-*`, `laptop-*`, `tablet-*` and `mobile-*` files are the Phase 1 design
captures, kept for reference.

## Stretch features

All three optional stretch features from the brief are **implemented and working**.

| Stretch feature | Status |
|---|---|
| Favorites list (localStorage) | **Done** — hearts on cards, the featured pick and the detail page; a favorites shelf in the sidebar; an empty state; and a header count badge. Survives a reload. |
| Filter / sort by year or subject | **Done** — subject re-queries Open Library; year and sort order are applied to the loaded set without another request. |
| "Load more" / pagination | **Done** — appends 24 at a time up to 10 pages, de-duplicates by work key, and keeps the results on screen if an extra page fails. |

Extra (not required by the brief): a grid/list layout toggle, a network-error state with a working
Retry, a `prefers-reduced-motion` fallback that disables all motion, and a shareable URL — a search
is restored from `?q=`, so a link to a result set can be sent to someone else.

## Design system

The visual language — tokens, type scale, spacing, radii, shadows, motion and component rules — is
documented in **[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md)**, and every token lives as a CSS custom
property at the top of `css/styles.css`.

In short: a calm, editorial "digital library" look — off-white canvas, book covers as the hero,
serif display type (Fraunces) against a sans UI face (DM Sans), and one confident blue for anything
actionable. Contrast was checked against WCAG AA: body text is `#130B08` on `#FDFDFD`, metadata
`#6B625C` (5.8:1), and text-bearing blue controls use `--blue-700` (4.7:1) because the brighter
brand blue only reaches 3.2:1.

## File structure

```
Book-Finder/
├── index.html              # Discover page
├── book-detail.html        # Detail view
├── ui-states.html          # State gallery (design reference)
├── css/
│   └── styles.css          # Design tokens + all component styles
├── js/
│   ├── api.js              # Open Library fetch layer + error normalising
│   ├── favorites.js        # localStorage favorites + change events
│   ├── render.js           # Pure templates (cards, detail, states)
│   ├── search.js           # Discover page controller
│   └── detail.js           # Detail page controller
├── assets/
│   ├── logo-mark.svg       # Brand mark
│   ├── logo-mark-light.svg
│   ├── favicon.svg
│   ├── decor-dunes.svg     # Featured-panel decoration
│   ├── book-placeholder.svg
│   ├── covers/             # sample covers for the featured/shelf picks (original SVG)
│   └── illustrations/      # welcome, no-results, network-error, empty-favorites
├── screenshots/            # 375 / 768 / 1024 / 1440 captures + state captures
├── DESIGN_SYSTEM.md
└── README.md
```

## Known limitations

- **Chrome blocks `fetch()` on `file://`.** Opening `index.html` by double-clicking renders the UI
  but every search fails. Serve it over HTTP (see [Running it locally](#running-it-locally)).
- **Filtering and sorting only cover what is loaded.** Year and sort order are applied client-side
  to the books already fetched — they do not re-query Open Library. This is deliberate: Open
  Library's `sort=old` and `sort=editions` parameters ignore the `q=` filter and return unrelated
  books (a `q=dune` request with `sort=editions` comes back with the *Divina Commedia*), and
  `sort=title` returns control characters. Filtering locally keeps the results honest.
- **Covers are best-effort.** `covers.openlibrary.org` 302-redirects to archive.org, so a cover can
  be slow or absent. Books without one fall back to `book-placeholder.svg` with the title typeset
  over it — never a broken image icon.
- **Missing data is common in the real API.** Not every work has a cover, a description or a subject
  list. Each case has a designed answer: the placeholder cover, a "No description available" notice,
  and subject sections that hide themselves when empty.
- **A work record can be thinner than its card.** A search result carries a cover and an author that
  the work record sometimes omits. The detail page falls back to the first edition cover and to the
  author shown on the card, and if the editions request fails it says so instead of reporting that the
  work has no editions.
- **Google Fonts require network access.** Offline, the fallback stacks (Iowan Old Style / Palatino /
  Georgia and system-ui) take over and the layout stays intact.
- **Favorites are per-browser.** They live in `localStorage`, so they do not follow the user between
  devices or browsers, and clearing site data removes them.
- **Coverage is desktop and mobile only**, verified at four widths (375 / 768 / 1024 / 1440).
- Open Library's search index is community-maintained, so result quality and completeness vary
  between books.

## Roadmap

1. ~~`js/api.js` — search, work and editions fetch helpers with error handling~~ ✅
2. ~~`js/render.js` — BookCard and DetailView templates + missing-data fallbacks~~ ✅
3. ~~Wire the SearchBar: form submit, mode selection, URL query param so a search is shareable~~ ✅
4. ~~Loading / no-results / network-error states driven by real request state~~ ✅
5. ~~Favorites in `localStorage`, with the nav count badge and favorites panel in sync~~ ✅
6. ~~Filter and sort by year/subject; Load More pagination~~ ✅
7. Deploy (GitHub Pages) and record the demo video/GIF — **remaining**

## Deadlines

- Final GitHub submission: **17 September 2026**
- Final demo: **18–19 September 2026**
