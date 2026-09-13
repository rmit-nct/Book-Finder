# Neo BookFinder — Design System (Phase 1)

A calm, editorial "digital library" look: off-white canvas, book covers as the hero, serif display type, and one confident blue for actions.
The visual direction adapts the layout principles of the *Booknest — Discover Books* concept (Can Cakmak, Dribbble). Branding, copy and assets are original.

All tokens live at the top of `css/styles.css` as CSS custom properties.

## Colour

| Token | Value | Use |
|---|---|---|
| `--canvas` | `#FDFDFD` | Page background |
| `--ink` | `#130B08` | Headings, body text, dark buttons, footer |
| `--blue-500` | `#279AD2` | Brand blue: focus rings, active indicators, decorative accents |
| `--blue-700` | `#1F7AAB` | Primary buttons and links (4.7:1 with white) |
| `--blue-800` | `#19628A` | Hover/pressed for blue controls |
| `--blue-50` / `--blue-100` | `#EEF7FC` / `#DCEFF9` | Pale blue panels, active nav, pressed toggles |
| `--brown-700` | `#593A25` | Warm secondary text, italic headline accent |
| `--gold-400` | `#C18F52` | Decorative only: rules, spines, illustrations (not for text) |
| `--rust-600` | `#A75724` | Small accent text (eyebrows, subjects), favorite "on" state |
| `--beige-50/100/200` | `#FBF7F1` / `#F5EBDD` / `#EBD9C1` | Warm feature panels (featured book, favorites, edition panel) |
| `--grey-400` | `#A7A8A6` | Borders, icons and disabled states only (fails as text) |
| `--color-text-muted` | `#6B625C` | Metadata and helper text (5.8:1) |
| `--danger-600` / `--danger-50` | `#A33A1F` / `#FCEFEA` | Network-error state |

**Hierarchy:** off-white page, ink text, blue for anything you can act on, gold and rust as small accents, pale blue and beige for large panels.
The reference sky blue (`#279AD2`) is only 3.2:1 against white, so text-bearing controls use `--blue-700`.

## Typography

- **Display / book titles:** Fraunces (serif, variable, optical sizing). Fallback: Iowan Old Style → Palatino → Georgia.
- **UI / body / metadata:** DM Sans. Fallback: system-ui → Segoe UI → Roboto → Arial.
- Both load from Google Fonts. The fallback stacks keep the layout intact offline.

| Token | Size | Typical use |
|---|---|---|
| `--text-4xl` | 36 → 56px (fluid) | Hero headline, detail title |
| `--text-3xl` | 32 → 44px | Featured title, showcase title |
| `--text-2xl` | 26 → 34px | Section headings, state titles |
| `--text-xl` | 22 → 26px | Detail section titles |
| `--text-lg` | 20px | Panel titles, fact values |
| `--text-base` | 16px | Body, card titles |
| `--text-sm` | 14px | Metadata, buttons, controls |
| `--text-xs` / `--text-2xs` | 12 / 11px | Labels, eyebrows, badges |

Line heights: `--leading-tight` 1.08 (display), `--leading-snug` 1.25 (headings), `--leading-normal` 1.5 (UI), `--leading-relaxed` 1.7 (long-form description).

## Spacing, radii, shadows

- **Spacing:** 4px base (`--space-1` = 4px up to `--space-20` = 80px). Page gutter is fluid (`--gutter`, 16 → 40px). Container is 1280px.
- **Radii:** 6 (tags) · 10 (buttons, inputs) · 14 (search field, fact strip) · 20 (cards, panels) · 28 (feature panels). Full pills are reserved for small count badges.
- **Shadows:** warm and low-opacity. `--shadow-sm` for panels, `--shadow-md` for the search card and card hover, `--shadow-cover` / `--shadow-cover-lg` for book covers (the strongest shadows, since covers are the focal point).
- **Motion:** 120 / 200 / 320ms with `--ease-out`. All motion is disabled under `prefers-reduced-motion`.
- **Touch targets:** `--tap` = 44px minimum for every interactive control.

## Components

| Component | Class / hook | Notes |
|---|---|---|
| Header | `.site-header`, `.site-nav` | Mobile: brand on top, three-item nav row below (no JS menu). The active link uses `aria-current`, a background and an underline. |
| SearchBar | `#search`, `#search-input`, `#search-button`, `input[name="search-mode"]` | Visible label, native radio segmented control (All / Title / Author), states: default, hover, focus, filled (`:placeholder-shown`), disabled. Phase 2: convert the wrapper to `<form>` and the button to `type="submit"`. |
| Featured book | `.featured` | Beige panel with decorative dunes (`assets/decor-dunes.svg`), large cover, tags, actions. |
| Toolbar | `.toolbar`, `#results-count`, `#results-subject`, `#results-year`, `#results-sort` | Native `<select>`s with visible inline labels. Grid/list toggle buttons use `aria-pressed`. |
| ResultsGrid | `#results-grid.book-grid` | 2 → 3 → 4 columns (1 below 360px). `.book-grid--list` switches to list layout. |
| BookCard | `.book-card` | 2:3 cover, subject, title (2-line clamp), author, year and edition count, favorite toggle (`aria-pressed`), "View details" link with a stretched hit area. The favorite button sits above the link, never inside it. |
| Missing cover | `.book-card__cover--missing` | `assets/book-placeholder.svg` plus a typeset title and a "No cover" label. |
| Aside panels | `.panel`, `.panel--blue`, `.panel--warm` | Trending subjects (`#categories`), Editor's shelf, Your favorites (`#favorites`). |
| Load More | `#load-more`, `#load-more-button` | Modifiers: `.is-loading` + `aria-busy`, `disabled`, and an end-of-results variant. |
| DetailView | `.detail`, `#detail` | Two columns ≥1024px, one column below. Cover stage, favorite toggle, Open Library link, fact strip, description, subject tags, edition panel. Ready to be placed in a `<dialog>`. |
| State blocks | `.state`, `.state--error`, `.welcome`, `.skeleton`, `.notice` | See `ui-states.html`. |

## Breakpoints (min-width)

`480` featured card widens · `640` search button moves inline and the grid goes to 3 columns · `768` desktop header and single-row toolbar · `1024` two-column hero, results with sidebar, two-column detail · `1280` 4-column grid and wider feature spacing.

Tested at 375, 768, 1024 and 1440px.

## UI states for Phase 2

Every state below is rendered statically in `ui-states.html`:

A. SearchBar states · 1. Initial welcome · 2. Populated results · 3. Search loading (skeleton cards and a status line) · 4. No results · 5. Network error with Retry · 6. Detail loading · 7. Missing-cover card (grid and list) · 8. Missing-description detail · 9. Empty favorites · 10. Load More states (default, hover, focus, loading, disabled, end).

Live-region hooks already in the markup: `#results-status` (`role="status"`). The error state uses `role="alert"`.
