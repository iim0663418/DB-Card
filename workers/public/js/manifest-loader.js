/**
 * Vite Manifest Dynamic Icon Loader
 * Automatically loads the correct icon bundle hash from manifest.json
 * Eliminates the need for manual hash updates in HTML files
 */

(function() {
  'use strict';

  const MANIFEST_PATH = '/dist/.vite/manifest.json';
  const FALLBACK_HASH = 'sS1r72aF'; // Current hash as fallback
  const ICON_ENTRY = 'src/icons.js'; // Vite uses src path as key

  /**
   * Load icon bundle dynamically from manifest
   */
  async function loadIconBundle() {
    try {
      // Fetch manifest.json
      const response = await fetch(MANIFEST_PATH);

      if (!response.ok) {
        throw new Error(`Manifest fetch failed: ${response.status}`);
      }

      const manifest = await response.json();

      // Find icons.js entry
      const iconEntry = manifest[ICON_ENTRY];

      if (!iconEntry || !iconEntry.file) {
        throw new Error('Icons entry not found in manifest');
      }

      // Inject script tag with correct hash
      const script = document.createElement('script');
      script.type = 'module';
      script.src = `/dist/${iconEntry.file}`;
      script.crossOrigin = 'anonymous';

      // Wait for script to load before initializing icons
      return new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = () => reject(new Error('Icon bundle load failed'));
        document.head.appendChild(script);
      });

    } catch (error) {
      console.warn('[Manifest Loader] Fallback to hardcoded hash:', error.message);

      // Fallback to current hash
      const script = document.createElement('script');
      script.type = 'module';
      script.src = `/dist/icons.${FALLBACK_HASH}.js`;
      document.head.appendChild(script);
    }
  }

  // Execute on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadIconBundle);
  } else {
    loadIconBundle();
  }
})();
