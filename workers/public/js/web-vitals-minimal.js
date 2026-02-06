// Minimal Web Vitals collector using native Performance API
// Collects: FCP, LCP, TTI (approximated)

(function() {
  const vitals = {};
  const API_BASE = window.location.origin;

  // Collect FCP (First Contentful Paint)
  const fcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.name === 'first-contentful-paint') {
        vitals.fcp = Math.round(entry.startTime);
      }
    });
  });
  fcpObserver.observe({ type: 'paint', buffered: true });

  // Collect LCP (Largest Contentful Paint)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    vitals.lcp = Math.round(lastEntry.startTime);
  });
  lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

  // Send vitals after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      // Approximate TTI as load time + 500ms
      vitals.tti = Math.round(performance.now());

      // Send to backend (non-blocking)
      if (vitals.fcp && vitals.lcp) {
        navigator.sendBeacon(`${API_BASE}/api/analytics/vitals`, JSON.stringify({
          fcp: vitals.fcp,
          lcp: vitals.lcp,
          tti: vitals.tti,
          page: 'card-display',
          timestamp: Date.now()
        }));
      }
    }, 1000);
  });
})();
