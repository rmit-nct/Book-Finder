/* ==========================================================================
   Neo BookFinder — js/detail.js
   Controller for book-detail.html.

   Reads ?key= from the URL, shows the DetailView loading state while the work
   record and its editions arrive, then renders the detail view. The query that
   led here is carried in the URL too, so "Back to results" restores it.
   ========================================================================== */

window.NeoBF = window.NeoBF || {};

(function (NS) {
  'use strict';

  /* Opening book-detail.html with no ?key shows the featured pick, so the page
     is still demonstrable on its own. Every link inside the app passes a real
     key, so this only affects a bare URL. */
  var DEFAULT_WORK_KEY = '/works/OL893414W';

  var els = { detail: null, backLink: null, breadcrumb: null };
  var context = { query: '', mode: 'all', subject: '' };
  var currentKey = '';
  var currentDetail = null;

  /* ---------------------------------------------------------------------
     URL
     --------------------------------------------------------------------- */

  function readParams() {
    var params = new URLSearchParams(window.location.search);
    var key = (params.get('key') || '').trim() || DEFAULT_WORK_KEY;

    /* Accept both /works/OL1W and a bare OL1W. */
    if (key.charAt(0) !== '/') { key = '/works/' + key; }

    context.query = (params.get('q') || '').trim();
    context.mode = params.get('mode') || 'all';
    context.subject = params.get('subject') || '';

    return key;
  }

  function backHref() {
    var params = new URLSearchParams();
    if (context.query) {
      params.set('q', context.query);
      if (context.mode !== 'all') { params.set('mode', context.mode); }
      if (context.subject) { params.set('subject', context.subject); }
    }
    var query = params.toString();
    return 'index.html' + (query ? '?' + query : '') + '#results';
  }

  /* ---------------------------------------------------------------------
     Rendering
     --------------------------------------------------------------------- */

  function showLoading() {
    els.detail.className = 'detail detail--loading';
    els.detail.setAttribute('aria-busy', 'true');
    els.detail.innerHTML = NS.render.detailSkeleton();
  }

  function updateBreadcrumb(detail) {
    if (!els.breadcrumb) { return; }
    var subjectHref = 'index.html?q=' + encodeURIComponent(detail.subject) + '#discover';
    els.breadcrumb.innerHTML =
      '<li><a href="' + NS.render.escapeHtml(backHref()) + '">Discover</a></li>' +
      '<li><a href="' + NS.render.escapeHtml(subjectHref) + '">' +
      NS.render.escapeHtml(detail.subject) + '</a></li>' +
      '<li><span aria-current="page">' + NS.render.escapeHtml(detail.title) + '</span></li>';
  }

  function updateHead(detail) {
    document.title = detail.title + ' — Book details · Neo BookFinder';
    var description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content',
        detail.title + ' by ' + detail.author + ' — subjects, editions and publish information from Open Library.');
    }
  }

  function renderDetail(detail) {
    currentDetail = detail;
    els.detail.className = 'detail';
    els.detail.removeAttribute('aria-busy');
    els.detail.innerHTML = NS.render.detailView(detail, {
      isFavorite: NS.favorites.has(detail.key)
    });

    updateHead(detail);
    updateBreadcrumb(detail);
    NS.favorites.syncButtons();
  }

  function renderError(error) {
    currentDetail = null;
    /* Drop the two-column grid so the shared error block can centre itself. */
    els.detail.className = '';
    els.detail.removeAttribute('aria-busy');
    els.detail.removeAttribute('aria-labelledby');
    els.detail.innerHTML = NS.render.errorState({
      label: 'Connection problem',
      title: 'We couldn’t load this book',
      text: 'The record didn’t come back from Open Library. Check your connection and try again — the book key stays in the address bar.',
      detail: (error && error.detail) || 'network error'
    });
  }

  /* ---------------------------------------------------------------------
     Loading
     --------------------------------------------------------------------- */

  function load(key) {
    currentKey = key;
    showLoading();

    NS.api.fetchDetail(key).then(function (detail) {
      if (currentKey !== key) { return; }   /* a newer request already won */
      renderDetail(detail);
    }).catch(function (error) {
      if (currentKey !== key) { return; }
      renderError(error);
    });
  }

  /* ---------------------------------------------------------------------
     Events
     --------------------------------------------------------------------- */

  /* The favorites store only knows about books that are already saved, so an
     unsaved heart on this page has to fall back to the record on screen.
     Without this the button could remove a favorite but never add one. */
  function shelfBook(key) {
    if (!currentDetail || currentDetail.key !== key) { return null; }
    var facts = currentDetail.facts || {};
    return {
      key: currentDetail.key,
      title: currentDetail.title,
      author: currentDetail.author,
      subject: currentDetail.subject,
      coverId: currentDetail.coverId,
      cover: currentDetail.cover,
      year: facts.earliestYear || null,
      editions: facts.count || 0
    };
  }

  function bindEvents() {
    /* Favorites toggle — same delegated hook the Discover page uses. */
    document.addEventListener('click', function (event) {
      var button = event.target.closest('[data-fav-key]');
      if (!button) { return; }

      var key = button.getAttribute('data-fav-key');
      var book = NS.favorites.find(key) || shelfBook(key);
      if (!book) { return; }

      event.preventDefault();
      NS.favorites.toggle(book);
    });

    /* Retry inside the error block. */
    els.detail.addEventListener('click', function (event) {
      if (event.target.closest('[data-action="retry"]')) {
        load(currentKey);
      }
    });

    NS.favorites.onChange(function (items, count) {
      NS.favorites.syncButtons();
      NS.favorites.syncBadges(count);
    });
  }

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */

  function init() {
    els.detail = document.getElementById('detail');
    if (!els.detail) { return; }

    els.backLink = document.querySelector('.detail-topbar .back-link');
    els.breadcrumb = document.querySelector('ol.breadcrumb');

    /* readParams() fills `context`, so it must run before backHref() — otherwise
       the back link is built while the query is still empty and loses ?q=. */
    var key = readParams();
    if (els.backLink) { els.backLink.setAttribute('href', backHref()); }

    bindEvents();
    NS.favorites.refresh();
    load(key);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.NeoBF);
