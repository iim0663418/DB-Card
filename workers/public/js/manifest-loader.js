/**
 * Vite Icon Bundle Loader
 * Loads the icon bundle directly with fallback hash.
 * Build step should update ICON_HASH when icons change.
 */
(function() {
  'use strict';
  const ICON_HASH = 'sS1r72aF';
  const script = document.createElement('script');
  script.type = 'module';
  script.src = `/dist/icons.${ICON_HASH}.js`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
})();
