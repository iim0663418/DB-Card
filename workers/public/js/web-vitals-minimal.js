// Minimal Web Vitals collector using native Performance API
// Collects: FCP, LCP, INP, CLS, CardContentReady

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

  // Collect INP (Interaction to Next Paint) - simplified: max event duration
  try {
    const inpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (vitals.inp === undefined || entry.duration > vitals.inp) {
          vitals.inp = Math.round(entry.duration);
        }
      });
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
  } catch (e) {
    vitals.inp = null;
  }

  // Collect CLS (Cumulative Layout Shift)
  vitals.cls = 0;
  try {
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          vitals.cls += entry.value;
        }
      });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    vitals.cls = null;
  }

  // Expose reportCardReady for main.js to call
  window.reportCardReady = function(timestamp) {
    vitals.card_content_ready = Math.round(timestamp);
  };

  // Send vitals after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (vitals.fcp && vitals.lcp) {
        navigator.sendBeacon(`${API_BASE}/api/analytics/vitals`, JSON.stringify({
          fcp: vitals.fcp,
          lcp: vitals.lcp,
          inp: vitals.inp !== undefined ? vitals.inp : null,
          cls: vitals.cls !== null ? Math.round(vitals.cls * 1000) / 1000 : null,
          card_content_ready: vitals.card_content_ready || null,
          page: 'card-display',
          timestamp: Date.now()
        }));
      }
    }, 1000);
  });
})();
