/* ==========================================================================
   Neo BookFinder — js/favorites.js
   Favorites live in localStorage so they survive a page change and a reload.

   Every write dispatches a "favorites:change" event on the document. The
   search page, the detail page and the header badge all listen for it, so a
   heart tapped on one card updates the shelf, the badge and the count in one
   go — no shared mutable state and no manual re-rendering.
   ========================================================================== */

window.NeoBF = window.NeoBF || {};

(function (NS) {
  'use strict';

  var STORAGE_KEY = 'neobf.favorites.v1';
  var CHANGE_EVENT = 'favorites:change';

  /* localStorage throws in some private-browsing modes and can be blocked
     entirely. When that happens the app keeps working for the session using
     an in-memory list instead of breaking. */
  var memoryFallback = [];
  var storageAvailable = (function () {
    try {
      var probe = '__neobf_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (error) {
      return false;
    }
  })();

  function readRaw() {
    if (!storageAvailable) { return memoryFallback.slice(); }
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) { return []; }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeRaw(items) {
    if (!storageAvailable) {
      memoryFallback = items.slice();
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      /* Quota or a blocked write — keep the session working in memory. */
      memoryFallback = items.slice();
    }
  }

  function emit(items) {
    document.dispatchEvent(new CustomEvent(CHANGE_EVENT, {
      detail: { items: items, count: items.length }
    }));
  }

  /* Only keep the fields the shelf and the cards need, so a long favorites
     list stays small in storage. */
  function toStored(book) {
    return {
      key: book.key,
      title: book.title,
      author: book.author,
      year: book.year || null,
      coverId: book.coverId || null,
      cover: book.cover || NS.api.PLACEHOLDER_COVER,
      subject: book.subject || 'General',
      editions: book.editions || 0
    };
  }

  function all() {
    return readRaw();
  }

  function count() {
    return readRaw().length;
  }

  function has(key) {
    if (!key) { return false; }
    return readRaw().some(function (item) { return item.key === key; });
  }

  function find(key) {
    var items = readRaw();
    for (var i = 0; i < items.length; i += 1) {
      if (items[i].key === key) { return items[i]; }
    }
    return null;
  }

  function add(book) {
    if (!book || !book.key) { return false; }
    var items = readRaw();
    var exists = items.some(function (item) { return item.key === book.key; });
    if (exists) { return false; }
    items.unshift(toStored(book));
    writeRaw(items);
    emit(items);
    return true;
  }

  function remove(key) {
    var items = readRaw();
    var next = items.filter(function (item) { return item.key !== key; });
    if (next.length === items.length) { return false; }
    writeRaw(next);
    emit(next);
    return true;
  }

  /* Returns true when the book ended up saved, false when it was removed. */
  function toggle(book) {
    if (!book || !book.key) { return false; }
    if (has(book.key)) {
      remove(book.key);
      return false;
    }
    add(book);
    return true;
  }

  function clear() {
    writeRaw([]);
    emit([]);
  }

  /* Re-broadcast the current state. Pages call this once on load so badges and
     shelves render even when nothing has been toggled yet. */
  function refresh() {
    emit(readRaw());
  }

  function onChange(handler) {
    document.addEventListener(CHANGE_EVENT, function (event) {
      handler(event.detail.items, event.detail.count);
    });
  }

  /* ---------------------------------------------------------------------
     Shared DOM sync helpers
     Both pages render favourite buttons and count badges. Keeping the sync
     here stops the aria-labels and the button copy drifting apart between
     index.html and book-detail.html.
     --------------------------------------------------------------------- */

  function syncButtons() {
    var buttons = document.querySelectorAll('[data-fav-key]');
    Array.prototype.forEach.call(buttons, function (button) {
      var key = button.getAttribute('data-fav-key');
      var saved = has(key);
      var title = button.getAttribute('data-fav-title') || '';

      button.setAttribute('aria-pressed', saved ? 'true' : 'false');
      if (title) {
        button.setAttribute('aria-label', (saved ? 'Remove ' : 'Save ') + title +
          (saved ? ' from' : ' to') + ' favorites');
      }
      var label = button.querySelector('span');
      if (label && button.classList.contains('fav-toggle')) {
        label.textContent = saved ? 'Saved to favorites' : 'Add to favorites';
      }
    });
  }

  function syncBadges(countOverride) {
    var total = typeof countOverride === 'number' ? countOverride : count();
    var badges = document.querySelectorAll('.count-badge');
    Array.prototype.forEach.call(badges, function (badge) {
      badge.textContent = String(total);
      badge.setAttribute('aria-label', total + ' saved');
      badge.hidden = total === 0;
    });
  }

  NS.favorites = {
    CHANGE_EVENT: CHANGE_EVENT,
    all: all,
    count: count,
    has: has,
    find: find,
    add: add,
    remove: remove,
    toggle: toggle,
    clear: clear,
    refresh: refresh,
    onChange: onChange,
    syncButtons: syncButtons,
    syncBadges: syncBadges,
    storageAvailable: storageAvailable
  };
})(window.NeoBF);
