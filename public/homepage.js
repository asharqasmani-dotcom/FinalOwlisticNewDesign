// Local demo of the original cookie choices. No analytics or ad trackers run.
(() => {
  const banner = document.getElementById("consent-banner");
  if (!banner) return;
  const key = "homepage-cookie-choices";
  let choice = null;
  try {
    choice = JSON.parse(localStorage.getItem(key));
  } catch {}
  const analytics = banner.querySelector("[data-consent-analytics]");
  const marketing = banner.querySelector("[data-consent-linkedin]");
  function show() {
    analytics.checked = !!choice?.analytics;
    marketing.checked = !!choice?.marketing;
    banner.hidden = false;
    document.documentElement.setAttribute("data-consent-open", "");
    banner.focus({ preventScroll: true });
  }
  function save(analytics, marketing) {
    choice = { analytics, marketing };
    try {
      localStorage.setItem(key, JSON.stringify(choice));
    } catch {}
    banner.hidden = true;
    document.documentElement.removeAttribute("data-consent-open");
  }
  banner
    .querySelector("[data-consent-accept]")
    .addEventListener("click", () =>
      save(analytics.checked, marketing.checked),
    );
  banner
    .querySelector("[data-consent-reject]")
    .addEventListener("click", () => save(false, false));
  document
    .querySelectorAll("[data-consent-reopen]")
    .forEach((button) => button.addEventListener("click", show));
  if (!choice) show();
})();
