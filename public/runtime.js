/* Functional fallbacks for the imported site. No visual restyling. */
(() => {
  if (window.__owlisticRuntime) return;
  window.__owlisticRuntime = true;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // A failed animation bundle must never leave an opaque page cover forever.
  const cover = document.querySelector('.transition');
  const reveal = () => { if (cover) cover.style.display = 'none'; };
  setTimeout(reveal, 2500);
  addEventListener('pageshow', event => { if (event.persisted) reveal(); });

  const videos = [...document.querySelectorAll('video[data-lazy-video]')];
  const visibleVideos = new Set();
  const updateVideo = video => {
    if (!visibleVideos.has(video) || document.hidden || reducedMotion.matches) {
      video.pause();
      return;
    }
    if (!video.dataset.loaded) {
      video.querySelectorAll('source[data-src]').forEach(source => { source.src = source.dataset.src; });
      if (video.dataset.src) video.src = video.dataset.src;
      video.dataset.loaded = 'true';
      video.load();
    }
    video.play().catch(() => {}); // Keep the existing poster if autoplay is unavailable.
  };
  const observer = new IntersectionObserver(entries => entries.forEach(({target, isIntersecting}) => {
    if (isIntersecting) visibleVideos.add(target); else visibleVideos.delete(target);
    updateVideo(target);
  }), {rootMargin: '100px 0px'});
  videos.forEach(video => observer.observe(video));
  document.addEventListener('visibilitychange', () => videos.forEach(updateVideo));
  reducedMotion.addEventListener('change', () => videos.forEach(updateVideo));

  // Collapsed content must not remain in the keyboard/screen-reader flow.
  const syncPanels = () => {
    document.querySelectorAll('[data-tier-card]').forEach(card => {
      const panel = card.querySelector('.tier__body');
      const collapsed = card.classList.contains('is-collapsible') && !card.classList.contains('is-open');
      if (panel) {
        panel.inert = collapsed;
        panel.setAttribute('aria-hidden', String(collapsed));
        if (!collapsed && card.classList.contains('is-collapsible')) panel.style.maxHeight = `${panel.scrollHeight}px`;
      }
    });
    document.querySelectorAll('[data-faq] .faq__btn').forEach(button => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      if (panel) panel.inert = button.getAttribute('aria-expanded') !== 'true';
    });
  };
  document.querySelectorAll('[data-tier-card], [data-faq]').forEach(element => {
    new MutationObserver(syncPanels).observe(element, {subtree: true, attributes: true, attributeFilter: ['aria-expanded', 'class']});
  });
  addEventListener('resize', syncPanels);
  document.fonts?.ready.then(syncPanels);
  syncPanels();
})();
if (['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('audit')) {
  const diagnostics = document.createElement('script');
  diagnostics.src = '/audit-metrics.js';
  document.head.appendChild(diagnostics);
}
