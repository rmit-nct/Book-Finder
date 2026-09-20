/* ==========================================================================
   Neo BookFinder — js/api.js
   The only place in the app that talks to Open Library.

   Everything here is wrapped in one global namespace (window.NeoBF) and loaded
   as a plain script, so the pages also work when opened straight from disk
   (file://) without a build step or a module server.
   ========================================================================== */

window.NeoBF = window.NeoBF || {};

(function (NS) {
  'use strict';

  /* ---------------------------------------------------------------------
     Endpoints
     --------------------------------------------------------------------- */

  var SEARCH_ENDPOINT = 'https://openlibrary.org/search.json';
  var COVERS_ENDPOINT = 'https://covers.openlibrary.org/b/id';
  var LIBRARY_ENDPOINT = 'https://openlibrary.org';

  /* Only ask for the fields the UI actually renders. Without this the search
     response carries ~30 keys per book and gets several times larger. */
  var SEARCH_FIELDS = [
    'key',
    'title',
    'author_name',
    'first_publish_year',
    'cover_i',
    'edition_count',
    'subject',
    'language'
  ].join(',');

  var REQUEST_TIMEOUT_MS = 12000;
  var PLACEHOLDER_COVER = 'assets/book-placeholder.svg';

  /* Subjects are shown as the small eyebrow above a card title. Open Library
     subjects are messy ("Dune (Imaginary place)", "Fiction, science fiction,
     general"), so prefer a short, well-known label when one is present. */
  var PREFERRED_SUBJECTS = [
    'Science fiction', 'Fantasy', 'Classics', 'Classic literature', 'History',
    'Romance', 'Mystery', 'Detective and mystery stories', 'Poetry', 'Biography',
    'Philosophy', 'Psychology', 'Business', 'Economics', 'Politics', 'Religion',
    'Satire', 'Drama', 'Horror', 'Adventure', 'Art', 'Music', 'Travel',
    'Cooking', 'Education', 'Science', 'Fiction'
  ];

  /* ISO 639-2 codes that show up most often in Open Library language keys.
     Anything not listed falls back to the upper-cased code. */
  var LANGUAGE_NAMES = {
    eng: 'English', fre: 'French', fra: 'French', ger: 'German', deu: 'German',
    spa: 'Spanish', ita: 'Italian', por: 'Portuguese', rus: 'Russian',
    dut: 'Dutch', nld: 'Dutch', pol: 'Polish', swe: 'Swedish', dan: 'Danish',
    nor: 'Norwegian', fin: 'Finnish', cze: 'Czech', ces: 'Czech', gre: 'Greek',
    tur: 'Turkish', ara: 'Arabic', heb: 'Hebrew', hin: 'Hindi', jpn: 'Japanese',
    chi: 'Chinese', zho: 'Chinese', kor: 'Korean', vie: 'Vietnamese',
    ukr: 'Ukrainian', rum: 'Romanian', ron: 'Romanian', hun: 'Hungarian',
    cat: 'Catalan', ice: 'Icelandic', isl: 'Icelandic', lat: 'Latin',
    und: 'Undetermined'
  };

  /* ---------------------------------------------------------------------
     Errors
     --------------------------------------------------------------------- */

  /* A single error type so the UI can show a friendly message plus a short
     technical detail line (the design has a slot for exactly that). */
  function ApiError(message, detail, status) {
    Error.call(this, message);
    this.name = 'ApiError';
    this.message = message;
    this.detail = detail || '';
    this.status = status || 0;
  }
  ApiError.prototype = Object.create(Error.prototype);
  ApiError.prototype.constructor = ApiError;

  /* ---------------------------------------------------------------------
     Transport
     --------------------------------------------------------------------- */

  function requestJSON(url) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);

    return fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    }).then(
      function (response) {
        clearTimeout(timer);
        if (!response.ok) {
          throw new ApiError(
            'Open Library returned an error.',
            'HTTP ' + response.status,
            response.status
          );
        }
        return response.json().catch(function () {
          throw new ApiError(
            'Open Library sent a response we could not read.',
            'invalid JSON'
          );
        });
      },
      function (error) {
        clearTimeout(timer);
        if (error && error.name === 'AbortError') {
          throw new ApiError(
            'The request took too long and was cancelled.',
            'request timed out'
          );
        }
        if (error instanceof ApiError) { throw error; }
        throw new ApiError(
          'The request could not be completed.',
          (error && error.message) || 'network error'
        );
      }
    );
  }

  /* ---------------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------------- */

  function coverUrl(coverId, size) {
    if (!coverId) { return PLACEHOLDER_COVER; }
    return COVERS_ENDPOINT + '/' + coverId + '-' + (size || 'M') + '.jpg';
  }

  function workPageUrl(workKey) {
    return LIBRARY_ENDPOINT + workKey;
  }

  function authorText(names) {
    if (!names || !names.length) { return 'Unknown author'; }
    if (names.length === 1) { return names[0]; }
    if (names.length === 2) { return names[0] + ' and ' + names[1]; }
    return names[0] + ' and ' + (names.length - 1) + ' others';
  }

  function pickSubject(subjects) {
    if (!subjects || !subjects.length) { return 'General'; }

    /* Keep only labels that read well on a card: short, no parentheticals and
       no comma-separated facets. */
    var clean = [];
    for (var i = 0; i < subjects.length; i += 1) {
      var subject = String(subjects[i]).trim();
      if (!subject) { continue; }
      if (subject.length > 32) { continue; }
      if (subject.indexOf('(') !== -1 || subject.indexOf(',') !== -1) { continue; }
      if (clean.indexOf(subject) === -1) { clean.push(subject); }
    }
    if (!clean.length) { return 'General'; }

    for (var p = 0; p < PREFERRED_SUBJECTS.length; p += 1) {
      var wanted = PREFERRED_SUBJECTS[p].toLowerCase();
      for (var c = 0; c < clean.length; c += 1) {
        if (clean[c].toLowerCase() === wanted) { return clean[c]; }
      }
    }
    return clean[0];
  }

  function languageName(code) {
    if (!code) { return ''; }
    return LANGUAGE_NAMES[code] || code.toUpperCase();
  }

  function parseYear(value) {
    if (!value) { return null; }
    var match = String(value).match(/(1[0-9]{3}|20[0-9]{2}|21[0-9]{2})/);
    return match ? parseInt(match[1], 10) : null;
  }

  function median(numbers) {
    if (!numbers || !numbers.length) { return null; }
    var sorted = numbers.slice().sort(function (a, b) { return a - b; });
    var middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) { return sorted[middle]; }
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }

  function unique(values) {
    var seen = [];
    for (var i = 0; i < values.length; i += 1) {
      var value = values[i];
      if (value && seen.indexOf(value) === -1) { seen.push(value); }
    }
    return seen;
  }

  function truncateList(items, max) {
    return {
      shown: items.slice(0, max),
      extra: Math.max(0, items.length - max)
    };
  }

  /* ---------------------------------------------------------------------
     Search
     --------------------------------------------------------------------- */

  /* Turn one search-result document into the shape the templates expect. */
  function normaliseDoc(doc) {
    var authors = Array.isArray(doc.author_name) ? doc.author_name.slice() : [];
    var subjects = Array.isArray(doc.subject) ? doc.subject.slice() : [];
    var coverId = doc.cover_i || null;

    return {
      key: doc.key || '',
      title: doc.title || 'Untitled',
      authors: authors,
      author: authorText(authors),
      year: doc.first_publish_year || null,
      coverId: coverId,
      cover: coverUrl(coverId),
      editions: doc.edition_count || 0,
      subjects: subjects,
      subject: pickSubject(subjects),
      languages: Array.isArray(doc.language) ? doc.language.slice() : []
    };
  }

  /* The segmented control picks which parameter carries the query. */
  function queryParamFor(mode) {
    if (mode === 'title') { return 'title'; }
    if (mode === 'author') { return 'author'; }
    return 'q';
  }

  function buildSearchUrl(options) {
    var params = new URLSearchParams();
    params.set(queryParamFor(options.mode), options.query);
    if (options.subject) { params.set('subject', options.subject); }
    params.set('fields', SEARCH_FIELDS);
    params.set('limit', String(options.limit || 24));
    params.set('page', String(options.page || 1));
    return SEARCH_ENDPOINT + '?' + params.toString();
  }

  function search(options) {
    var page = options.page || 1;
    var limit = options.limit || 24;

    return requestJSON(buildSearchUrl({
      query: options.query,
      mode: options.mode,
      subject: options.subject,
      page: page,
      limit: limit
    })).then(function (data) {
      var docs = Array.isArray(data.docs) ? data.docs : [];
      return {
        query: options.query,
        page: page,
        limit: limit,
        total: typeof data.numFound === 'number' ? data.numFound : docs.length,
        books: docs.map(normaliseDoc)
      };
    });
  }

  /* ---------------------------------------------------------------------
     Detail view
     --------------------------------------------------------------------- */

  function fetchWork(workKey) {
    return requestJSON(LIBRARY_ENDPOINT + workKey + '.json');
  }

  function fetchEditions(workKey, limit) {
    return requestJSON(LIBRARY_ENDPOINT + workKey + '/editions.json?limit=' + (limit || 60))
      .then(function (data) {
        return Array.isArray(data.entries) ? data.entries : [];
      });
  }

  /* works.json only carries author *keys*, so names need a second lookup.
     Capped at three authors and allowed to fail quietly. */
  function fetchAuthorNames(work) {
    var refs = Array.isArray(work.authors) ? work.authors.slice(0, 3) : [];
    if (!refs.length) { return Promise.resolve([]); }

    var requests = refs.map(function (ref) {
      var key = ref && ref.author && ref.author.key;
      if (!key) { return Promise.resolve(null); }
      return requestJSON(LIBRARY_ENDPOINT + key + '.json')
        .then(function (author) { return author && author.name ? author.name : null; })
        .catch(function () { return null; });
    });

    return Promise.all(requests).then(function (names) {
      return names.filter(function (name) { return !!name; });
    });
  }

  /* `description` is a string on most works but an object on some. */
  function descriptionText(work) {
    var description = work && work.description;
    if (!description) { return ''; }
    if (typeof description === 'string') { return description; }
    if (typeof description === 'object' && typeof description.value === 'string') {
      return description.value;
    }
    return '';
  }

  function buildEditionFacts(editions) {
    var publishers = [];
    var languages = [];
    var pageCounts = [];
    var years = [];
    var isbn = '';
    var dated = [];

    editions.forEach(function (edition) {
      if (Array.isArray(edition.publishers)) {
        publishers = publishers.concat(edition.publishers);
      }
      if (Array.isArray(edition.languages)) {
        edition.languages.forEach(function (language) {
          if (language && language.key) {
            languages.push(language.key.replace('/languages/', ''));
          }
        });
      }
      if (typeof edition.number_of_pages === 'number') {
        pageCounts.push(edition.number_of_pages);
      }
      var year = parseYear(edition.publish_date);
      if (year) {
        years.push(year);
        dated.push({ year: year, edition: edition });
      }
      if (!isbn) {
        var isbn13 = (edition.isbn_13 || [])[0];
        var isbn10 = (edition.isbn_10 || [])[0];
        isbn = isbn13 || isbn10 || '';
      }
    });

    dated.sort(function (a, b) { return a.year - b.year; });

    var uniquePublishers = unique(publishers);
    var uniqueLanguages = unique(languages);
    var firstEdition = dated.length ? dated[0] : null;

    return {
      count: editions.length,
      publishers: uniquePublishers,
      publishersList: truncateList(uniquePublishers, 3),
      languages: uniqueLanguages.map(languageName),
      languagesList: truncateList(uniqueLanguages.map(languageName), 5),
      medianPages: median(pageCounts),
      earliestYear: years.length ? Math.min.apply(null, years) : null,
      latestYear: years.length ? Math.max.apply(null, years) : null,
      firstEdition: firstEdition
        ? {
            year: firstEdition.year,
            publisher: (firstEdition.edition.publishers || [])[0] || 'Publisher not listed',
            title: firstEdition.edition.title || ''
          }
        : null,
      isbn: isbn
    };
  }

  /* A work record often has no cover of its own, but its editions usually do.
     Grab the first positive cover id so a book that showed a cover in the
     results does not lose it on the detail page. */
  function firstEditionCoverId(editions) {
    for (var i = 0; i < editions.length; i += 1) {
      var covers = editions[i].covers;
      if (Array.isArray(covers)) {
        for (var c = 0; c < covers.length; c += 1) {
          if (covers[c] > 0) { return covers[c]; }
        }
      }
    }
    return null;
  }

  /* One call for the whole detail page: work record, edition list, author
     names and the derived facts strip.

     `options.coverId` and `options.author` come from the search card that
     linked here, used only as fallbacks when the work record lacks them. */
  function fetchDetail(workKey, options) {
    var settings = options || {};

    return Promise.all([
      fetchWork(workKey),
      fetchEditions(workKey, 60).then(function (editions) {
        return { editions: editions, failed: false };
      }).catch(function () {
        /* Remember the failure so the page can say "couldn't load" instead of
           wrongly claiming the work has no editions. */
        return { editions: [], failed: true };
      })
    ]).then(function (results) {
      var work = results[0];
      var editionsResult = results[1];
      var editions = editionsResult.editions;

      return fetchAuthorNames(work).then(function (names) {
        var subjects = Array.isArray(work.subjects) ? work.subjects : [];
        var facts = buildEditionFacts(editions);
        var coverId = null;
        if (work.covers && work.covers.length && work.covers[0] > 0) {
          coverId = work.covers[0];
        } else {
          coverId = firstEditionCoverId(editions);
        }
        if (!coverId && settings.coverId) { coverId = settings.coverId; }

        /* Fall back to the author shown on the card when the author lookup
           comes back empty, so the page never says "Unknown author" for a
           book the results list already attributed. */
        var authorNames = names;
        if (!authorNames.length && settings.author) {
          authorNames = [settings.author];
        }

        return {
          key: workKey,
          title: work.title || 'Untitled',
          authors: authorNames,
          author: authorNames.length ? authorText(authorNames) : 'Unknown author',
          subject: pickSubject(subjects),
          subjects: subjects,
          subjectList: truncateList(subjects, 7),
          description: descriptionText(work),
          coverId: coverId,
          cover: coverId ? coverUrl(coverId, 'L') : PLACEHOLDER_COVER,
          coverSmall: coverId ? coverUrl(coverId, 'M') : PLACEHOLDER_COVER,
          firstPublishDate: work.first_publish_date || '',
          facts: facts,
          editionsFailed: editionsResult.failed,
          openLibraryUrl: workPageUrl(workKey)
        };
      });
    });
  }

  /* ---------------------------------------------------------------------
     Export
     --------------------------------------------------------------------- */

  NS.api = {
    ApiError: ApiError,
    search: search,
    fetchDetail: fetchDetail,
    coverUrl: coverUrl,
    workPageUrl: workPageUrl,
    pickSubject: pickSubject,
    authorText: authorText,
    languageName: languageName,
    PLACEHOLDER_COVER: PLACEHOLDER_COVER
  };
})(window.NeoBF);
