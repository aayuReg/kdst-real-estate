// Google Analytics 4 (GA4)
//
// 1. Create a free account at https://analytics.google.com
// 2. Add a "Web" data stream for this site, copy its Measurement ID
//    (looks like G-XXXXXXXXXX)
// 3. Paste it below in place of the placeholder.
//
// Until a real ID is set, this file intentionally does nothing — no
// broken network requests, no console errors, no tracking of any kind.
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';

(function loadAnalytics() {
  const isConfigured = !GA_MEASUREMENT_ID.includes('XXXXXXXXXX');
  if (!isConfigured) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
})();
