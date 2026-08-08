/**
 * Vite Manifest Loader
 * Loads bundled entries (icons, user-portal) via manifest.json with hash fallback.
 * Build step generates manifest; this loader resolves hashed filenames at runtime.
 */
(function() {
  'use strict';

  // Fallback hashes — updated by build process or manually
  var FALLBACK = {
    'icons': 'icons.sS1r72aF.js',
    'user-portal': 'user-portal.Bui6l3bK.js',
    'index': 'index.Cfu5iNai.js',
    'admin-dashboard': 'admin-dashboard.Zot_nVbf.js',
    'card-display': 'card-display.BtMsubxh.js',
    'qr-quick': 'qr-quick.HcaXRGQV.js'
  };

  // Determine which entries this page needs
  var page = document.documentElement.dataset.page || '';
  var entries = ['icons']; // Always load icons
  if (page === 'user-portal') {
    entries.push('user-portal');
  } else if (page === 'index') {
    entries.push('index');
  } else if (page === 'admin-dashboard') {
    entries.push('admin-dashboard');
  } else if (page === 'card-display') {
    entries.push('card-display');
  } else if (page === 'qr-quick') {
    entries.push('qr-quick');
  }

  function loadScript(src) {
    var s = document.createElement('script');
    s.type = 'module';
    s.src = src;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  // Try manifest.json first, fallback to hardcoded hashes
  fetch('/dist/.vite/manifest.json')
    .then(function(res) {
      if (!res.ok) throw new Error('manifest not found');
      return res.json();
    })
    .then(function(manifest) {
      entries.forEach(function(entry) {
        // Find entry in manifest by name field
        var found = null;
        var keys = Object.keys(manifest);
        for (var i = 0; i < keys.length; i++) {
          if (manifest[keys[i]].name === entry) {
            found = manifest[keys[i]];
            break;
          }
        }
        if (found) {
          loadScript('/dist/' + found.file);
        } else if (FALLBACK[entry]) {
          loadScript('/dist/' + FALLBACK[entry]);
        }
      });
    })
    .catch(function() {
      // Manifest fetch failed — use fallbacks
      entries.forEach(function(entry) {
        if (FALLBACK[entry]) {
          loadScript('/dist/' + FALLBACK[entry]);
        }
      });
    });
})();
