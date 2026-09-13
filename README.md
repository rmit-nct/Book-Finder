# Neo BookFinder

A frontend-only web app for searching books by title, author or keyword and browsing the results —
covers, authors and publish years — pulled from the free, key-less **Open Library** API. Selecting a
book opens a detail view with a longer description, subjects/genres and publish information.

Built with plain **HTML, CSS and vanilla JavaScript**. No framework, no backend, no database and no
API key: the whole app runs in the browser.

> **Current status — Phase 1 (static UI) is complete.**
> Every page, component and UI state is built and rendered as static markup.
> Phase 2 (JavaScript: `fetch()` against Open Library, rendering, favorites) is next — see
> [Roadmap](#roadmap).

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
`file://` URLs during Phase 2 — a local server avoids that entirely.

Requirements: a modern browser (Chrome, Firefox, Safari or Edge). An internet connection is needed
for the Google Fonts (Fraunces + DM Sans); offline, the layout falls back to the system font stack
and stays intact.

## Pages

| File | What it shows |
|---|---|
| `index.html` | **Discover** — hero + SearchBar, featured pick, results toolbar, ResultsGrid of BookCards, sidebar panels (trending subjects, editor's shelf, favorites), Load More |
| `book-detail.html` | **DetailView** — cover stage, favorite toggle, fact strip, description, subject tags, edition panel |
| `ui-states.html` | **Every UI state rendered statically** — loading, no results, network error, missing cover, missing description, empty favorites, Load More variants |

## Components

The four components named in the brief, and where they live:

| Component | Hook | Notes |
|---|---|---|
| **SearchBar** | `#search`, `#search-input`, `#search-button`, `input[name="search-mode"]` | Visible label, native radio segmented control (All / Title / Author). States: default, hover, focus, filled, disabled. |
| **ResultsGrid** | `#results-grid.book-grid` | 1 → 2 → 3 → 4 columns. `.book-grid--list` switches to a list layout. |
| **BookCard** | `.book-card` | 2:3 cover, subject, title (2-line clamp), author, year + edition count, favorite toggle (`aria-pressed`), "View details" link with a stretched hit area. |
| **DetailView** | `.detail`, `#detail` | Two columns ≥1024px, one column below. Ready to be placed inside a `<dialog>`. |

## Open Library endpoints

These are the endpoints the UI is designed around. **Phase 1 renders static markup only** — no
`fetch()` call exists in the repo yet; Phase 2 wires these up.

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
layout. All of them are built and visible side by side in `ui-states.html`:

1. SearchBar states (default, hover, focus, filled, disabled)
2. Initial welcome state
3. Populated results
4. Search loading — skeleton cards + status line
5. No results found
6. Network error with a Retry action
7. Detail loading
8. Missing-cover card (grid and list)
9. Missing-description detail
10. Empty favorites
11. Load More states (default, hover, focus, loading, disabled, end of results)

Accessibility hooks already in the markup: `#results-status` uses `role="status"` for live
announcements, the error state uses `role="alert"`, the grid/list toggle and favorite buttons use
`aria-pressed`, the active nav link uses `aria-current`, and a skip link is the first focusable
element on every page.

## Responsive layout

Breakpoints (min-width): `480` featured card widens · `640` search button moves inline, grid → 3
columns · `768` desktop header, single-row toolbar · `1024` two-column hero, results with sidebar,
two-column detail · `1280` 4-column grid.

Tested at **375, 768, 1024 and 1440px** — see [`screenshots/`](screenshots).

## Stretch features

All three optional stretch features from the brief have their **UI complete** in Phase 1; their
logic lands in Phase 2.

| Stretch feature | Status |
|---|---|
| Favorites list (localStorage) | UI complete — favorite toggles on cards and detail, favorites panel, empty state, nav count badge. Persistence to `localStorage` pending. |
| Filter / sort by year or subject | UI complete — native `<select>` controls for subject, year and sort order. Filtering logic pending. |
| "Load more" / pagination | UI complete — every state rendered including loading, disabled and end-of-results. Paging logic pending. |

Extra (not required by the brief): a grid/list layout toggle, a network-error retry state, and a
`prefers-reduced-motion` fallback that disables all motion.

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
├── ui-states.html          # Every UI state, rendered statically
├── css/
│   └── styles.css          # Design tokens + all component styles
├── assets/
│   ├── logo-mark.svg       # Brand mark
│   ├── logo-mark-light.svg
│   ├── favicon.svg
│   ├── decor-dunes.svg     # Featured-panel decoration
│   ├── book-placeholder.svg
│   ├── covers/             # 11 sample covers (original SVG placeholders)
│   └── illustrations/      # welcome, no-results, network-error, empty-favorites
├── screenshots/            # 375 / 768 / 1024 / 1440 captures + state captures
├── DESIGN_SYSTEM.md
└── README.md
```

Phase 2 will add a `js/` folder (`api.js`, `search.js`, `render.js`, `favorites.js`).

## Known limitations

- **Phase 1 is static.** There is no JavaScript in the repo yet, so typing in the search box,
  clicking a card, toggling a favorite or pressing Load More does not do anything. Every state is
  present as markup, waiting to be driven by data.
- **The books shown are hard-coded sample data** (Dune, 1984, The Hobbit, …) and the covers are
  original SVG placeholders — not the real Open Library cover images.
- **Missing data is common in the real API.** Not every book has a cover, a description or a subject
  list. The UI has a designed answer for each (`book-placeholder.svg` with a typeset title, a
  "No description available" block, hidden subject sections), but Phase 2 still has to map API
  `null`s onto those states.
- **Google Fonts require network access.** Offline, the fallback stacks (Iowan Old Style / Palatino /
  Georgia and system-ui) take over.
- **Coverage is desktop and mobile only**, verified at four widths (375 / 768 / 1024 / 1440).
- The favorites count badge in the header shows a static number until Phase 2.
- Open Library's search index is community-maintained, so result quality and completeness vary
  between books.

## Roadmap

1. `js/api.js` — search, work and editions fetch helpers with error handling
2. `js/render.js` — BookCard and DetailView templates + missing-data fallbacks
3. Wire the SearchBar: form submit, mode selection, URL query param so a search is shareable
4. Loading / no-results / network-error states driven by real request state
5. Favorites in `localStorage`, with the nav count badge and favorites panel in sync
6. Filter and sort by year/subject; Load More pagination
7. Deploy (GitHub Pages) and record the demo video/GIF

## Deadlines

- Final GitHub submission: **17 September 2026**
- Final demo: **18–19 September 2026**
