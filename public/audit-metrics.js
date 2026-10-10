// Opt-in localhost diagnostics. Open a local page with ?audit=1.
(() => {
  const metrics = { cls: 0, lcp: 0 };
  for (const type of ['largest-contentful-paint', 'layout-shift']) {
    try { new PerformanceObserver(list => list.getEntries().forEach(entry => {
      if (type === 'largest-contentful-paint') metrics.lcp = Math.round(entry.startTime);
      else if (!entry.hadRecentInput) metrics.cls += entry.value;
    })).observe({type, buffered:true}); } catch {}
  }
  const report = () => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    console.info('OWLISTIC_AUDIT ' + JSON.stringify({...metrics, cls:Number(metrics.cls.toFixed(4)), ttfb:Math.round(nav?.responseStart || 0), dom:Math.round(nav?.domContentLoadedEventEnd || 0), load:Math.round(nav?.loadEventEnd || 0), fcp:Math.round(fcp?.startTime || 0), resources:performance.getEntriesByType('resource').length, transferred:performance.getEntriesByType('resource').reduce((sum,r)=>sum+r.transferSize,0)}));
  };
  setTimeout(report, 4000);
})();
