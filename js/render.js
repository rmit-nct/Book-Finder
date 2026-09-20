/* ==========================================================================
   Neo BookFinder — js/render.js
   Pure template functions. Nothing here touches the network or reads state
   from the DOM: give it data, get back the same markup the design system was
   built against (see index.html, book-detail.html and ui-states.html).

   Every piece of API text goes through escapeHtml() first — titles, authors
   and descriptions all come from a community-edited catalogue.
   ========================================================================== */

window.NeoBF = window.NeoBF || {};

(function (NS) {
  'use strict';

  /* ---------------------------------------------------------------------
     Escaping and formatting
     --------------------------------------------------------------------- */

  var ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    if (value === null || value === undefined) { return ''; }
    return String(value).replace(/[&<>"']/g, function (character) {
      return ESCAPES[character];
    });
  }

  var numberFormat = new Intl.NumberFormat('en-US');

  function formatNumber(value) {
    if (typeof value !== 'number' || !isFinite(value)) { return '0'; }
    return numberFormat.format(value);
  }

  function pluralise(count, singular, plural) {
    return count === 1 ? singular : (plural || singular + 's');
  }

  /* A stable, valid element id derived from an Open Library key. */
  function slug(value) {
    return String(value || 'book')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'book';
  }

  /* The detail page carries the search that led to it, so "Back to results"
     can restore the exact query instead of dropping the visitor on an empty
     Discover page. */
  function detailHref(bookKey, context) {
    var params = new URLSearchParams();
    var settings = context || {};
    params.set('key', bookKey);
    if (settings.query) {
      params.set('q', settings.query);
      if (settings.mode && settings.mode !== 'all') { params.set('mode', settings.mode); }
      if (settings.subject) { params.set('subject', settings.subject); }
    }
    /* Carry the cover and author the card already knows, so the detail page can
       fall back to them when the work record is missing either. */
    if (settings.coverId) { params.set('cover', String(settings.coverId)); }
    if (settings.author) { params.set('author', settings.author); }
    return 'book-detail.html?' + params.toString();
  }

  function coverAlt(book) {
    if (!book.coverId) {
      return 'No cover available for ' + book.title;
    }
    return 'Cover of ' + book.title + ' by ' + book.author;
  }

  /* ---------------------------------------------------------------------
     Icons (inline so they inherit currentColor and need no extra requests)
     --------------------------------------------------------------------- */

  var icon = {
    calendar: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    editions: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    arrowRight: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowDown: '<svg class="btn__icon icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    chevronRight: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>',
    heart: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/></svg>',
    external: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    search: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    close: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    alert: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4 2.5 20h19L12 4z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
    retry: '<svg class="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></svg>',
    book: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 6.5C6.8 5.3 9.5 5.5 12 7v12c-2.5-1.5-5.2-1.7-8-.5z"/><path d="M20 6.5C17.2 5.3 14.5 5.5 12 7v12c2.5-1.5 5.2-1.7 8-.5z"/></svg>',
    noticeLines: '<svg class="notice__icon icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 6h14M5 10h14M5 14h9"/></svg>',
    publisher: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 20V6l8-3 8 3v14"/><path d="M9 20v-5h6v5M4 20h16"/></svg>',
    globe: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>',
    file: '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>'
  };

  /* ---------------------------------------------------------------------
     BookCard
     --------------------------------------------------------------------- */

  function coverMarkup(book) {
    if (book.coverId) {
      return '<div class="book-card__cover">' +
        '<img src="' + escapeHtml(book.cover) + '" alt="' + escapeHtml(coverAlt(book)) + '" ' +
        'width="200" height="300" loading="lazy" decoding="async">' +
        '</div>';
    }
    /* Missing-cover state: the local placeholder plus the typeset title keeps
       the grid even instead of collapsing the card. */
    return '<div class="book-card__cover book-card__cover--missing">' +
      '<img src="' + escapeHtml(NS.api.PLACEHOLDER_COVER) + '" alt="' + escapeHtml(coverAlt(book)) + '" ' +
      'width="200" height="300" loading="lazy" decoding="async">' +
      '<div class="cover-fallback" aria-hidden="true">' +
      '<span class="cover-fallback__title">' + escapeHtml(book.title) + '</span>' +
      '<span class="cover-fallback__author">' + escapeHtml(book.author) + '</span>' +
      '</div>' +
      '<span class="cover-fallback__note" aria-hidden="true">No cover</span>' +
      '</div>';
  }

  function metaMarkup(book) {
    var year = book.year
      ? escapeHtml(book.year)
      : 'Year unknown';
    var editions = book.editions
      ? escapeHtml(formatNumber(book.editions)) + ' ' + pluralise(book.editions, 'edition')
      : 'No editions listed';

    return '<dl class="book-card__meta">' +
      '<div><dt class="visually-hidden">First published</dt><dd>' + icon.calendar + year + '</dd></div>' +
      '<div><dt class="visually-hidden">Editions</dt><dd>' + icon.editions + editions + '</dd></div>' +
      '</dl>';
  }

  function favoriteButton(book, isFavorite, className) {
    return '<button class="icon-btn fav-btn ' + className + '" type="button" ' +
      'aria-pressed="' + (isFavorite ? 'true' : 'false') + '" ' +
      'aria-label="' + (isFavorite ? 'Remove ' : 'Save ') + escapeHtml(book.title) + ' ' +
      (isFavorite ? 'from' : 'to') + ' favorites" ' +
      'data-fav-key="' + escapeHtml(book.key) + '" ' +
      'data-fav-title="' + escapeHtml(book.title) + '">' + icon.heart + '</button>';
  }

  /* Returns the <li> so the markup can go straight into #results-grid. */
  function bookCard(book, options) {
    var settings = options || {};
    var isFavorite = !!settings.isFavorite;
    var id = 'book-' + slug(book.key);
    var context = settings.context || {};
    var href = detailHref(book.key, {
      query: context.query,
      mode: context.mode,
      subject: context.subject,
      coverId: book.coverId,
      author: book.author
    });

    return '<li>' +
      '<article class="book-card" aria-labelledby="' + id + '">' +
      coverMarkup(book) +
      '<div class="book-card__body">' +
      '<p class="book-card__subject">' + escapeHtml(book.subject) + '</p>' +
      '<h3 class="book-card__title" id="' + id + '">' + escapeHtml(book.title) + '</h3>' +
      '<p class="book-card__author">' + escapeHtml(book.author) + '</p>' +
      metaMarkup(book) +
      '<div class="book-card__actions">' +
      '<a class="book-card__link" href="' + escapeHtml(href) + '">View details' +
      '<span class="visually-hidden">: ' + escapeHtml(book.title) + '</span>' + icon.arrowRight + '</a>' +
      favoriteButton(book, isFavorite, 'book-card__fav') +
      '</div>' +
      '</div>' +
      '</article>' +
      '</li>';
  }

  function skeletonCard() {
    return '<li>' +
      '<div class="book-card book-card--skeleton" aria-hidden="true">' +
      '<span class="skeleton skeleton--cover"></span>' +
      '<div class="book-card__body">' +
      '<span class="skeleton skeleton--line skeleton--w40"></span>' +
      '<span class="skeleton skeleton--title"></span>' +
      '<span class="skeleton skeleton--title skeleton--w55"></span>' +
      '<span class="skeleton skeleton--line skeleton--w55"></span>' +
      '<span class="skeleton skeleton--line skeleton--meta"></span>' +
      '<div class="book-card__actions"><span class="skeleton skeleton--link"></span>' +
      '<span class="skeleton skeleton--circle"></span></div>' +
      '</div>' +
      '</div>' +
      '</li>';
  }

  function skeletonCards(count) {
    var out = '';
    for (var i = 0; i < count; i += 1) { out += skeletonCard(); }
    return out;
  }

  /* ---------------------------------------------------------------------
     State blocks
     --------------------------------------------------------------------- */

  var SUGGESTIONS = ['Dune', 'Toni Morrison', 'Stoicism', 'Poetry', 'Space opera'];

  function welcomeState() {
    var chips = SUGGESTIONS.map(function (suggestion) {
      return '<li><button class="suggestion" type="button" data-suggestion="' +
        escapeHtml(suggestion) + '">' + icon.search + escapeHtml(suggestion) + '</button></li>';
    }).join('');

    return '<div class="welcome">' +
      '<img class="welcome__art" src="assets/illustrations/welcome.svg" alt="" width="240" height="180">' +
      '<div>' +
      '<p class="eyebrow">Start here</p>' +
      '<h3 class="welcome__title">What would you like to read next?</h3>' +
      '<p class="welcome__text">Search by title, author or keyword. Each result shows the cover, author and first publication year.</p>' +
      '<ul class="state__list" role="list" aria-label="Popular searches">' + chips + '</ul>' +
      '</div>' +
      '</div>';
  }

  function noResultsState(query, note) {
    var text = note ||
      'Check the spelling, try fewer words, or search by author instead. Switching the filter back to “All” can also help.';

    return '<div class="state" role="status">' +
      '<img class="state__art" src="assets/illustrations/no-results.svg" alt="" width="200" height="160">' +
      '<h3 class="state__title">No books match <q>' + escapeHtml(query) + '</q></h3>' +
      '<p class="state__text">' + escapeHtml(text) + '</p>' +
      '<div class="state__actions">' +
      '<button class="btn" type="button" data-action="clear-search">' + icon.close + 'Clear search</button>' +
      '<a class="btn btn--ghost" href="#categories">Browse trending subjects</a>' +
      '</div>' +
      '</div>';
  }

  /* Empty-input case: the brief asks for a clear on-screen message rather
     than a silent no-op when the box is blank. */
  function emptyInputState() {
    var chips = SUGGESTIONS.map(function (suggestion) {
      return '<li><button class="suggestion" type="button" data-suggestion="' +
        escapeHtml(suggestion) + '">' + icon.search + escapeHtml(suggestion) + '</button></li>';
    }).join('');

    return '<div class="state" role="status">' +
      '<img class="state__art" src="assets/illustrations/no-results.svg" alt="" width="200" height="160">' +
      '<h3 class="state__title">Type something to search</h3>' +
      '<p class="state__text">Enter a book title, an author’s name or a keyword. The search box is empty, so there is nothing to look up yet.</p>' +
      '<ul class="state__list" role="list" aria-label="Popular searches">' + chips + '</ul>' +
      '</div>';
  }

  function errorState(options) {    var settings = options || {};
    var title = settings.title || 'We couldn’t reach Open Library';
    var text = settings.text ||
      'Your search didn’t go through. Check your connection and try again. Your filters and search text are kept.';
    var detail = settings.detail || 'network error';
    var label = settings.label || 'Connection problem';
    var action = settings.actionLabel || 'Retry';

    return '<div class="state state--error" role="alert">' +
      '<img class="state__art" src="assets/illustrations/network-error.svg" alt="" width="200" height="160">' +
      '<p class="state__label">' + icon.alert + escapeHtml(label) + '</p>' +
      '<h3 class="state__title">' + escapeHtml(title) + '</h3>' +
      '<p class="state__text">' + escapeHtml(text) + '</p>' +
      '<div class="state__actions">' +
      '<button class="btn btn--primary" type="button" data-action="retry">' + icon.retry +
      escapeHtml(action) + '</button>' +
      '</div>' +
      '<p class="state__hint">Technical detail: <span class="state__code">' +
      escapeHtml(detail) + '</span></p>' +
      '</div>';
  }

  /* Compact variant of the empty state — the favorites shelf sits in a narrow
     aside, so the shared block needs less padding there. */
  function emptyFavoritesState() {
    return '<div class="state state--compact">' +
      '<img class="state__art" src="assets/illustrations/empty-favorites.svg" alt="" width="200" height="160">' +
      '<h3 class="state__title">Your favorites shelf is empty</h3>' +
      '<p class="state__text">Tap the heart on any book to keep it here. Favorites are saved in this browser, so they stay after you close the tab.</p>' +
      '<div class="state__actions">' +
      '<a class="btn btn--primary" href="#discover">Explore books' + icon.arrowRight + '</a>' +
      '</div>' +
      '</div>';
  }

  function statusLine(text) {
    return '<p class="status-line" role="status"><span class="spinner" aria-hidden="true"></span>' +
      escapeHtml(text) + '</p>';
  }

  /* ---------------------------------------------------------------------
     Favorites shelf
     --------------------------------------------------------------------- */

  function shelfItem(book) {
    return '<li class="shelf-item">' +
      '<div class="shelf-item__cover"><img src="' + escapeHtml(book.cover) + '" alt="" ' +
      'width="48" height="72" loading="lazy"></div>' +
      '<div>' +
      '<h3 class="shelf-item__title"><a href="' + escapeHtml(detailHref(book.key, {
        coverId: book.coverId,
        author: book.author
      })) + '">' +
      escapeHtml(book.title) + '</a></h3>' +
      '<p class="shelf-item__author">' + escapeHtml(book.author) + '</p>' +
      '</div>' +
      '<span class="shelf-item__go" aria-hidden="true">' + icon.chevronRight + '</span>' +
      '</li>';
  }

  /* ---------------------------------------------------------------------
     DetailView
     --------------------------------------------------------------------- */

  /* Descriptions arrive as plain text, sometimes with hard wraps, dashed
     separators or markdown links. Turn that into a couple of tidy <p>s and
     stop before the blurb becomes a wall of text. */
  function descriptionParagraphs(text, maxLength) {
    var limit = maxLength || 1200;
    var cleaned = String(text)
      .replace(/\r/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .split(/\n{2,}/)
      .map(function (block) {
        return block
          .split('\n')
          .filter(function (line) { return !/^\s*[-_=*]{3,}\s*$/.test(line); })
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      })
      .filter(function (block) { return block.length > 0; });

    var used = 0;
    var out = [];
    for (var i = 0; i < cleaned.length && i < 4; i += 1) {
      var block = cleaned[i];
      if (used && used + block.length > limit) { break; }
      if (block.length > limit) {
        var cut = block.slice(0, limit);
        var lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
        block = (lastStop > 200 ? cut.slice(0, lastStop + 1) : cut.trim()) + '…';
      }
      out.push(block);
      used += block.length;
    }
    return out;
  }

  function factsMarkup(detail) {
    var facts = detail.facts || {};
    var year = facts.earliestYear || (detail.firstPublishDate || '').match(/\d{4}/);
    if (Array.isArray(year)) { year = year[0]; }

    function cell(label, value) {
      return '<div><dt>' + label + '</dt><dd>' + escapeHtml(value === null || value === undefined || value === '' ? '—' : value) + '</dd></div>';
    }

    return '<dl class="facts" aria-label="Publication information">' +
      cell('First published', year) +
      cell('Editions', facts.count ? formatNumber(facts.count) : '—') +
      cell('Languages', (facts.languages && facts.languages.length) ? formatNumber(facts.languages.length) : '—') +
      cell('Median pages', facts.medianPages ? formatNumber(facts.medianPages) : '—') +
      '</dl>';
  }

  function aboutMarkup(detail) {
    var paragraphs = descriptionParagraphs(detail.description);

    if (!paragraphs.length) {
      /* Missing-description state — the notice replaces the prose and every
         other section still renders. */
      return '<div class="notice" role="note">' + icon.noticeLines +
        '<p class="notice__title">No description available yet</p>' +
        '<p>Open Library doesn’t have a summary for this work. Subjects and edition details are shown below, and the full record may include notes from individual editions.</p>' +
        '</div>';
    }

    return '<div class="prose">' + paragraphs.map(function (paragraph) {
      return '<p>' + escapeHtml(paragraph) + '</p>';
    }).join('') + '</div>';
  }

  function subjectsMarkup(detail) {
    var list = detail.subjectList || { shown: [], extra: 0 };

    if (!list.shown.length) {
      return '<div class="notice" role="note">' + icon.noticeLines +
        '<p class="notice__title">No subjects listed yet</p>' +
        '<p>This record has no subject tags, so there is nothing to browse by here.</p>' +
        '</div>';
    }

    var tags = list.shown.map(function (subject) {
      return '<li><a class="tag" href="index.html?q=' + encodeURIComponent(subject) + '#discover">' +
        escapeHtml(subject) + '</a></li>';
    }).join('');

    if (list.extra > 0) {
      tags += '<li class="tag tag--more">+ ' + formatNumber(list.extra) + ' more subjects</li>';
    }

    return '<ul class="tag-list" role="list">' + tags + '</ul>';
  }

  function editionMarkup(detail) {
    var facts = detail.facts || {};

    if (!facts.count) {
      /* Distinguish a failed editions request from a work that genuinely has
         no editions, so the message does not blame the catalogue. */
      if (detail.editionsFailed) {
        return '<div class="notice" role="note">' + icon.noticeLines +
          '<p class="notice__title">Edition details didn’t load</p>' +
          '<p>Open Library did not return the edition list for this work. Go back and open the book again, or retry in a moment.</p>' +
          '</div>';
      }
      return '<div class="notice" role="note">' + icon.noticeLines +
        '<p class="notice__title">No edition details available yet</p>' +
        '<p>Open Library lists this work but has no edition records for it, so publisher, language and page details cannot be shown.</p>' +
        '</div>';
    }

    function listCell(label, iconMarkup, list, emptyText) {
      var value;
      if (!list || !list.shown.length) {
        value = emptyText;
      } else {
        value = escapeHtml(list.shown.join(', '));
        if (list.extra > 0) {
          value += ' <span class="more">+ ' + formatNumber(list.extra) + ' more</span>';
        }
      }
      return '<div><dt>' + iconMarkup + label + '</dt><dd>' + value + '</dd></div>';
    }

    var firstEdition = facts.firstEdition
      ? facts.firstEdition.publisher + ', ' + facts.firstEdition.year
      : 'Not listed for this record';

    return '<dl class="edition-grid">' +
      '<div><dt>' + icon.calendar + 'First edition</dt><dd>' + escapeHtml(firstEdition) + '</dd></div>' +
      listCell('Publishers', icon.publisher, facts.publishersList, 'Not listed for this record') +
      listCell('Languages', icon.globe, facts.languagesList, 'Not listed for this record') +
      '<div><dt>' + icon.file + 'Sample ISBN</dt><dd>' +
      escapeHtml(facts.isbn || 'Not listed for this record') + '</dd></div>' +
      '</dl>';
  }

  function detailView(detail, options) {
    var settings = options || {};
    var isFavorite = !!settings.isFavorite;
    var hasCover = !!detail.coverId;

    var coverInner = '<img src="' + escapeHtml(hasCover ? detail.cover : NS.api.PLACEHOLDER_COVER) + '" ' +
      'alt="' + escapeHtml(hasCover
        ? 'Cover of ' + detail.title + ' by ' + detail.author
        : 'No cover available for ' + detail.title) + '" width="200" height="300">';

    if (!hasCover) {
      coverInner += '<div class="cover-fallback" aria-hidden="true">' +
        '<span class="cover-fallback__title">' + escapeHtml(detail.title) + '</span>' +
        '<span class="cover-fallback__author">' + escapeHtml(detail.author) + '</span>' +
        '</div>';
    }

    return '<div class="detail__media">' +
      '<div class="detail__stage"><div class="detail__cover">' + coverInner + '</div></div>' +
      '<div class="detail__actions">' +
      '<button class="btn btn--lg fav-toggle" id="detail-favorite" type="button" ' +
      'aria-pressed="' + (isFavorite ? 'true' : 'false') + '" ' +
      'data-fav-key="' + escapeHtml(detail.key) + '" ' +
      'data-fav-title="' + escapeHtml(detail.title) + '">' + icon.heart +
      '<span>' + (isFavorite ? 'Saved to favorites' : 'Add to favorites') + '</span></button>' +
      '<a class="btn btn--primary btn--lg" href="' + escapeHtml(detail.openLibraryUrl) + '" rel="noopener">' +
      'View on Open Library' + icon.external + '</a>' +
      '</div>' +
      '</div>' +
      '<div class="detail__content">' +
      '<div class="detail__intro">' +
      '<p class="eyebrow">' + escapeHtml(detail.subject) + '</p>' +
      '<h1 class="detail__title" id="detail-title">' + escapeHtml(detail.title) + '</h1>' +
      '<p class="detail__author">by <strong>' + escapeHtml(detail.author) + '</strong></p>' +
      '</div>' +
      factsMarkup(detail) +
      '<section class="detail__section" aria-labelledby="detail-about">' +
      '<h2 class="detail__section-title" id="detail-about">About this book</h2>' +
      aboutMarkup(detail) +
      '</section>' +
      '<section class="detail__section" aria-labelledby="detail-subjects">' +
      '<h2 class="detail__section-title" id="detail-subjects">Subjects</h2>' +
      subjectsMarkup(detail) +
      '</section>' +
      '<section class="detail__section edition-panel" aria-labelledby="detail-edition">' +
      '<h2 class="detail__section-title" id="detail-edition">Edition information</h2>' +
      editionMarkup(detail) +
      '</section>' +
      '<p class="detail__source">' + icon.book +
      'Record from Open Library. Details can differ between editions.</p>' +
      '</div>';
  }

  /* Detail-loading state — same layout as the DetailView so nothing jumps. */
  function detailSkeleton() {
    return '<div class="detail__media">' +
      '<div class="detail__stage"><span class="skeleton skeleton--cover"></span></div>' +
      '<div class="detail__actions"><span class="skeleton skeleton--btn"></span>' +
      '<span class="skeleton skeleton--btn"></span></div>' +
      '</div>' +
      '<div class="detail__content">' +
      statusLine('Loading book details…') +
      '<div class="skeleton-stack" aria-hidden="true">' +
      '<span class="skeleton skeleton--line skeleton--w40"></span>' +
      '<span class="skeleton skeleton--h1"></span>' +
      '<span class="skeleton skeleton--line skeleton--w40"></span>' +
      '</div>' +
      '<span class="skeleton skeleton--facts" aria-hidden="true"></span>' +
      '<div class="skeleton-stack" aria-hidden="true">' +
      '<span class="skeleton skeleton--title skeleton--w40"></span>' +
      '<span class="skeleton skeleton--line skeleton--w90"></span>' +
      '<span class="skeleton skeleton--line"></span>' +
      '<span class="skeleton skeleton--line skeleton--w90"></span>' +
      '<span class="skeleton skeleton--line skeleton--w55"></span>' +
      '</div>' +
      '<div class="tag-list" aria-hidden="true"><span class="skeleton skeleton--pill"></span>' +
      '<span class="skeleton skeleton--pill"></span><span class="skeleton skeleton--pill"></span>' +
      '<span class="skeleton skeleton--pill"></span></div>' +
      '</div>';
  }

  /* ---------------------------------------------------------------------
     Export
     --------------------------------------------------------------------- */

  NS.render = {
    icon: icon,
    escapeHtml: escapeHtml,
    formatNumber: formatNumber,
    pluralise: pluralise,
    slug: slug,
    detailHref: detailHref,
    bookCard: bookCard,
    skeletonCard: skeletonCard,
    skeletonCards: skeletonCards,
    welcomeState: welcomeState,
    noResultsState: noResultsState,
    emptyInputState: emptyInputState,
    errorState: errorState,
    emptyFavoritesState: emptyFavoritesState,
    statusLine: statusLine,
    shelfItem: shelfItem,
    detailView: detailView,
    detailSkeleton: detailSkeleton,
    descriptionParagraphs: descriptionParagraphs
  };
})(window.NeoBF);
