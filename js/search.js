/* ==========================================================================
   Neo BookFinder — js/search.js
   Controller for index.html.

   Owns the SearchBar, the ResultsGrid, the filter/sort toolbar, Load More,
   the favorites shelf and the welcome / loading / empty / error states.
   ========================================================================== */

window.NeoBF = window.NeoBF || {};

(function (NS) {
  'use strict';

  var PAGE_SIZE = 24;

  /* Deep pagination on search.json gets slow, and a 48,000-hit result set is
     not useful to scroll anyway. Ten pages is 240 books. */
  var MAX_PAGES = 10;

  /* The featured pick is a real work record, so its heart button and its
     "View details" link behave exactly like a card's. It keeps the local SVG
     cover the design uses rather than the remote one. */
  var FEATURED_BOOK = {
    key: '/works/OL893414W',
    title: 'Dune',
    author: 'Frank Herbert',
    year: 1965,
    coverId: null,
    cover: 'assets/covers/dune.svg',
    subject: 'Science fiction',
    editions: 161
  };

  var state = {
    query: '',
    mode: 'all',
    subject: '',
    books: [],
    total: 0,
    page: 0,
    phase: 'welcome',      /* welcome | empty-input | loading | results | no-results | error */
    lastError: null,
    lastRequest: null,
    requestId: 0,
    layout: 'grid'
  };

  var els = {};

  /* ---------------------------------------------------------------------
     Element lookup
     --------------------------------------------------------------------- */

  function byId(id) { return document.getElementById(id); }

  function cacheElements() {
    els.form = byId('search-form');
    els.input = byId('search-input');
    els.button = byId('search-button');
    els.toolbar = byId('results-toolbar');
    els.count = byId('results-count');
    els.stateHost = byId('results-state');
    els.status = byId('results-status');
    els.grid = byId('results-grid');
    els.loadMore = byId('load-more');
    els.loadMoreCount = byId('load-more-count');
    els.loadMoreButton = byId('load-more-button');
    els.loadMoreStatus = byId('load-more-status');
    els.subject = byId('results-subject');
    els.year = byId('results-year');
    els.sort = byId('results-sort');
    els.viewToggle = document.querySelector('.view-toggle');
    els.aside = document.querySelector('.discover__aside');
    els.favList = byId('favorites-list');
    els.favEmpty = byId('favorites-empty');
  }

  function reduceMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---------------------------------------------------------------------
     Toolbar readers
     --------------------------------------------------------------------- */

  function currentMode() {
    var checked = els.form.querySelector('input[name="search-mode"]:checked');
    return checked ? checked.value : 'all';
  }

  function readSubject() {
    return els.subject.selectedIndex === 0 ? '' : els.subject.value;
  }

  /* The year and sort options have no value attributes, so they are read by
     position — that keeps the en dash in "1900–1949" from being parsed. */
  function readYearBucket() { return els.year.selectedIndex; }
  function readSortIndex() { return els.sort.selectedIndex; }

  function selectByText(select, text) {
    for (var i = 0; i < select.options.length; i += 1) {
      if (select.options[i].textContent.trim() === text) {
        select.selectedIndex = i;
        return true;
      }
    }
    return false;
  }

  function setModeRadio(mode) {
    var radio = els.form.querySelector('input[name="search-mode"][value="' + mode + '"]');
    if (radio) { radio.checked = true; }
  }

  function resetModeRadio() { setModeRadio('all'); }

  /* ---------------------------------------------------------------------
     Filtering and sorting
     --------------------------------------------------------------------- */

  var SORT_COMPARATORS = {
    1: function (a, b) { return yearValue(b) - yearValue(a); },              /* Newest first */
    2: function (a, b) { return yearValue(a) - yearValue(b); },              /* Oldest first */
    3: function (a, b) { return a.title.localeCompare(b.title); },           /* Title A–Z */
    4: function (a, b) { return (b.editions || 0) - (a.editions || 0); }     /* Most editions */
  };

  /* Books with no publish year always sort to the bottom, whichever direction
     is chosen, so an incomplete record never leads the list. */
  function yearValue(book) {
    return book.year || (readSortIndex() === 1 ? -1 : 9999);
  }

  function sortBooks(books, index) {
    var comparator = SORT_COMPARATORS[index];
    if (!comparator) { return books; }
    return books.slice().sort(comparator);
  }

  function visibleBooks() {
    var bucket = readYearBucket();
    var books = state.books;

    if (bucket > 0) {
      books = books.filter(function (book) {
        if (!book.year) { return false; }
        if (bucket === 1) { return book.year < 1900; }
        if (bucket === 2) { return book.year >= 1900 && book.year <= 1949; }
        if (bucket === 3) { return book.year >= 1950 && book.year <= 1999; }
        return book.year >= 2000;
      });
    }
    return sortBooks(books, readSortIndex());
  }

  /* ---------------------------------------------------------------------
     Rendering
     --------------------------------------------------------------------- */

  function searchContext() {
    return { query: state.query, mode: state.mode, subject: state.subject };
  }

  function countLine(shown) {
    var html = '<strong>' + NS.render.formatNumber(shown) + '</strong> of ' +
      NS.render.formatNumber(state.total) + ' ' + NS.render.pluralise(state.total, 'result') +
      ' for <q>' + NS.render.escapeHtml(state.query) + '</q>';

    if (state.subject) {
      html += ' in <strong>' + NS.render.escapeHtml(state.subject) + '</strong>';
    }
    if (readYearBucket() > 0) {
      html += ' · year filter applied';
    }
    return html;
  }

  function loadMoreMarkup() {
    var loaded = state.books.length;
    var reachedEnd = loaded >= state.total || state.page >= MAX_PAGES;

    els.loadMoreCount.innerHTML = '<span>Showing <strong>' + NS.render.formatNumber(loaded) +
      '</strong> of ' + NS.render.formatNumber(Math.min(state.total, MAX_PAGES * PAGE_SIZE)) +
      ' books</span>';

    if (reachedEnd) {
      els.loadMoreButton.disabled = true;
      els.loadMoreButton.classList.remove('is-loading');
      els.loadMoreButton.removeAttribute('aria-busy');
      els.loadMoreButton.innerHTML = NS.render.icon.book +
        '<span class="btn__label">You’ve reached the end</span>';
    } else {
      els.loadMoreButton.disabled = false;
      els.loadMoreButton.classList.remove('is-loading');
      els.loadMoreButton.removeAttribute('aria-busy');
      els.loadMoreButton.innerHTML = '<span class="btn__label">Load more books</span>' +
        NS.render.icon.arrowDown + '<span class="spinner" aria-hidden="true"></span>';
    }
  }

  function setLoadMoreLoading() {
    els.loadMoreButton.disabled = true;
    els.loadMoreButton.classList.add('is-loading');
    els.loadMoreButton.setAttribute('aria-busy', 'true');
    els.loadMoreButton.innerHTML = '<span class="btn__label">Loading more books…</span>' +
      NS.render.icon.arrowDown + '<span class="spinner" aria-hidden="true"></span>';
    els.loadMoreStatus.innerHTML = '';
  }

  function render() {
    var phase = state.phase;
    var books = phase === 'results' ? visibleBooks() : [];
    var filteredToNothing = phase === 'results' && books.length === 0 && state.books.length > 0;

    /* Toolbar is part of the results state only. */
    els.toolbar.hidden = phase !== 'results';

    /* Grid: real cards, skeletons while loading, nothing otherwise. */
    if (phase === 'results' && books.length > 0) {
      els.grid.hidden = false;
      els.grid.setAttribute('aria-busy', 'false');
      els.grid.innerHTML = books.map(function (book) {
        return NS.render.bookCard(book, {
          isFavorite: NS.favorites.has(book.key),
          context: searchContext()
        });
      }).join('');
    } else if (phase === 'loading') {
      els.grid.hidden = false;
      els.grid.setAttribute('aria-busy', 'true');
      els.grid.innerHTML = NS.render.skeletonCards(8);
    } else {
      els.grid.hidden = true;
      els.grid.setAttribute('aria-busy', 'false');
      els.grid.innerHTML = '';
    }

    /* Load More sits under the grid and only makes sense with results on screen. */
    els.loadMore.hidden = !(phase === 'results' && state.books.length > 0);
    if (!els.loadMore.hidden) { loadMoreMarkup(); }
    els.loadMoreStatus.innerHTML = '';

    /* State block */
    var stateHtml = '';
    if (phase === 'welcome') {
      stateHtml = NS.render.welcomeState();
    } else if (phase === 'empty-input') {
      stateHtml = NS.render.emptyInputState();
    } else if (phase === 'loading') {
      stateHtml = NS.render.statusLine('Searching Open Library for “' + state.query + '”…');
    } else if (phase === 'no-results') {
      stateHtml = NS.render.noResultsState(state.query);
    } else if (phase === 'error') {
      stateHtml = NS.render.errorState({
        detail: (state.lastError && state.lastError.detail) || 'network error',
        title: (state.lastError && state.lastError.message) ? 'Search is unavailable right now' : undefined
      });
    } else if (filteredToNothing) {
      stateHtml = NS.render.noResultsState(
        state.query,
        'None of the books loaded so far were first published in that range. Set the year filter back to “Any year”, or load more books and try again.'
      );
    }
    els.stateHost.innerHTML = stateHtml;
    els.stateHost.hidden = !stateHtml;

    if (phase === 'results' && books.length > 0) {
      els.count.innerHTML = countLine(books.length);
    }
  }

  function announce() {
    if (state.phase === 'loading') {
      els.status.textContent = 'Searching Open Library for ' + state.query;
      return;
    }
    if (state.phase === 'no-results') {
      els.status.textContent = 'No results for ' + state.query;
      return;
    }
    if (state.phase === 'error') {
      els.status.textContent = 'The search failed. ' + ((state.lastError && state.lastError.detail) || '');
      return;
    }
    if (state.phase === 'empty-input') {
      els.status.textContent = 'The search box is empty. Enter a title, author or keyword.';
      return;
    }
    if (state.phase === 'results') {
      var books = visibleBooks();
      els.status.textContent = books.length + ' of ' + state.total + ' results for ' + state.query + '.';
    }
  }

  /* ---------------------------------------------------------------------
     Search
     --------------------------------------------------------------------- */

  function performSearch(overrides) {
    var options = overrides || {};
    var query = typeof options.query === 'string' ? options.query : els.input.value;
    query = (query || '').replace(/\s+/g, ' ').trim();

    /* One token per search: any response whose token is stale is ignored, so a
       slower earlier request can never overwrite a newer one. This also covers
       switching mode or subject while the query text stays the same. */
    state.requestId += 1;
    var requestId = state.requestId;

    if (!query) {
      state.query = '';
      state.books = [];
      state.total = 0;
      state.phase = 'empty-input';
      render();
      announce();
      els.input.focus();
      return;
    }

    state.query = query;
    state.mode = options.mode || currentMode();
    state.subject = typeof options.subject === 'string' ? options.subject : readSubject();
    state.books = [];
    state.total = 0;
    state.page = 0;
    state.phase = 'loading';
    state.lastError = null;
    els.input.value = query;
    state.lastRequest = {
      query: state.query,
      mode: state.mode,
      subject: state.subject,
      page: 1,
      limit: PAGE_SIZE
    };

    render();
    announce();

    NS.api.search(state.lastRequest).then(function (result) {
      if (requestId !== state.requestId) { return; }   /* a newer search already won */

      state.books = result.books;
      state.total = result.total;
      state.page = 1;
      state.phase = state.books.length ? 'results' : 'no-results';
      render();
      announce();
      updateUrl();
    }).catch(function (error) {
      if (requestId !== state.requestId) { return; }
      state.lastError = error;
      state.phase = 'error';
      render();
      announce();
    });
  }

  function loadMore() {
    if (state.phase !== 'results') { return; }
    if (state.page >= MAX_PAGES) { return; }
    if (state.books.length >= state.total) { return; }

    setLoadMoreLoading();

    var requestId = state.requestId;

    NS.api.search({
      query: state.query,
      mode: state.mode,
      subject: state.subject,
      page: state.page + 1,
      limit: PAGE_SIZE
    }).then(function (result) {
      if (requestId !== state.requestId) { return; }

      var seen = {};
      state.books.forEach(function (book) { seen[book.key] = true; });
      result.books.forEach(function (book) {
        if (!seen[book.key]) { state.books.push(book); }
      });
      state.page = result.page;
      render();
      announce();
    }).catch(function (error) {
      /* Keep the results already on screen — only the extra page failed. */
      loadMoreMarkup();
      els.loadMoreStatus.innerHTML = '<p class="status-line" role="alert">' +
        NS.render.icon.alert + 'Couldn’t load more books (' +
        NS.render.escapeHtml(error.detail || 'network error') +
        '). Check your connection and try again.</p>';
    });
  }

  /* ---------------------------------------------------------------------
     Favorites
     --------------------------------------------------------------------- */

  function findBook(key) {
    for (var i = 0; i < state.books.length; i += 1) {
      if (state.books[i].key === key) { return state.books[i]; }
    }
    if (FEATURED_BOOK.key === key) { return FEATURED_BOOK; }
    return NS.favorites.find(key);
  }

  function renderFavorites(items) {
    if (!els.favList) { return; }
    els.favList.innerHTML = items.map(NS.render.shelfItem).join('');
    els.favList.hidden = items.length === 0;
    els.favEmpty.hidden = items.length > 0;
    els.favEmpty.innerHTML = items.length ? '' : NS.render.emptyFavoritesState();
  }

  /* ---------------------------------------------------------------------
     URL
     --------------------------------------------------------------------- */

  function updateUrl() {
    var params = new URLSearchParams();
    if (state.query) { params.set('q', state.query); }
    if (state.mode && state.mode !== 'all') { params.set('mode', state.mode); }
    if (state.subject) { params.set('subject', state.subject); }

    var query = params.toString();
    try {
      window.history.replaceState(null, '', window.location.pathname +
        (query ? '?' + query : '') + '#discover');
    } catch (error) {
      /* file:// or a sandboxed frame — the search still works without it. */
    }
  }

  function restoreFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var query = (params.get('q') || '').trim();
    var mode = params.get('mode') || 'all';
    var subject = params.get('subject') || '';

    if (mode !== 'all') { setModeRadio(mode); }
    if (subject && !selectByText(els.subject, subject)) {
      /* A subject from a shared link is not in the fixed option list, so add it
         and select it, keeping the control in step with the applied filter. */
      var option = document.createElement('option');
      option.textContent = subject;
      els.subject.appendChild(option);
      els.subject.selectedIndex = els.subject.options.length - 1;
    }

    if (query) {
      els.input.value = query;
      performSearch({ query: query, mode: mode, subject: subject });
    } else {
      state.phase = 'welcome';
      render();
      announce();
    }
  }

  /* ---------------------------------------------------------------------
     Events
     --------------------------------------------------------------------- */

  function scrollToResults() {
    var target = byId('results');
    if (!target || !target.scrollIntoView) { return; }
    target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function applyLayout() {
    var buttons = els.viewToggle ? els.viewToggle.querySelectorAll('.icon-btn') : [];
    els.grid.classList.toggle('book-grid--list', state.layout === 'list');
    Array.prototype.forEach.call(buttons, function (button, index) {
      var isActive = (index === 0 && state.layout === 'grid') ||
        (index === 1 && state.layout === 'list');
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function bindEvents() {
    /* SearchBar — the wrapper is a real <form>, so Enter works for free. */
    els.form.addEventListener('submit', function (event) {
      event.preventDefault();
      performSearch();
    });

    /* Switching All / Title / Author re-runs the current search. */
    els.form.addEventListener('change', function (event) {
      if (event.target.name === 'search-mode' && state.query && state.phase !== 'loading') {
        performSearch({ mode: event.target.value });
      }
    });

    /* Subject is filtered by Open Library itself, so it needs a new request. */
    els.subject.addEventListener('change', function () {
      if (state.query) { performSearch({ subject: readSubject() }); }
    });

    /* Year and sort are applied to what is already loaded — no extra request. */
    els.year.addEventListener('change', function () { render(); announce(); });
    els.sort.addEventListener('change', function () { render(); announce(); });

    if (els.viewToggle) {
      els.viewToggle.addEventListener('click', function (event) {
        var button = event.target.closest('.icon-btn');
        if (!button) { return; }
        var buttons = Array.prototype.slice.call(els.viewToggle.querySelectorAll('.icon-btn'));
        state.layout = buttons.indexOf(button) === 1 ? 'list' : 'grid';
        applyLayout();
      });
    }

    els.loadMoreButton.addEventListener('click', loadMore);

    /* State blocks: suggestion chips, Retry and Clear search. */
    els.stateHost.addEventListener('click', function (event) {
      var suggestion = event.target.closest('[data-suggestion]');
      if (suggestion) {
        var term = suggestion.getAttribute('data-suggestion');
        els.input.value = term;
        resetModeRadio();
        els.subject.selectedIndex = 0;
        performSearch({ query: term, mode: 'all', subject: '' });
        scrollToResults();
        return;
      }

      var action = event.target.closest('[data-action]');
      if (!action) { return; }

      if (action.getAttribute('data-action') === 'retry') {
        performSearch(state.lastRequest || {});
      } else if (action.getAttribute('data-action') === 'clear-search') {
        els.input.value = '';
        els.subject.selectedIndex = 0;
        els.year.selectedIndex = 0;
        els.sort.selectedIndex = 0;
        resetModeRadio();
        state.query = '';
        state.books = [];
        state.total = 0;
        state.phase = 'welcome';
        render();
        announce();
        updateUrl();
        els.input.focus();
      }
    });

    /* Trending subjects in the aside run a search instead of jumping nowhere. */
    if (els.aside) {
      els.aside.addEventListener('click', function (event) {
        var link = event.target.closest('.subject-link');
        if (!link) { return; }
        event.preventDefault();
        var term = link.textContent.trim();
        els.input.value = term;
        resetModeRadio();
        els.subject.selectedIndex = 0;
        performSearch({ query: term, mode: 'all', subject: '' });
        scrollToResults();
      });
    }

    /* One delegated handler covers the featured card, every BookCard and the
       detail page toggle. */
    document.addEventListener('click', function (event) {
      var button = event.target.closest('[data-fav-key]');
      if (!button) { return; }
      var key = button.getAttribute('data-fav-key');
      var book = findBook(key);
      if (!book) { return; }
      event.preventDefault();
      NS.favorites.toggle(book);
    });

    NS.favorites.onChange(function (items, count) {
      NS.favorites.syncButtons();
      NS.favorites.syncBadges(count);
      renderFavorites(items);
    });
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */

  function init() {
    cacheElements();
    if (!els.form || !els.grid) { return; }

    bindEvents();
    applyLayout();
    NS.favorites.refresh();
    restoreFromUrl();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.NeoBF);
