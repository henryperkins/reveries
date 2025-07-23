/**
 * Conditionally load visibility-debug helpers.
 * 
 * Usage: append `?debug-visibility` to the dev-server URL
 * (e.g. http://localhost:5173/?debug-visibility) and refresh.
 * The heavy CSS will never be bundled in production.
 */
if (import.meta.env.DEV && window.location.search.includes('debug-visibility')) {
  // Force-visibility helpers
  import('./styles/fix-visibility.css');
  // Additional debug visuals
  import('./styles/debug-visibility.css');
  // Add a class for scoped selectors
  document.body.classList.add('debug-visibility');
}
