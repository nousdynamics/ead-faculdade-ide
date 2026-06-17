(function () {
  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function headerOffset() {
    var value = getComputedStyle(document.documentElement).getPropertyValue("--site-header-offset");
    var parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function scrollToTarget(target, behavior) {
    if (!target) return;

    var top = window.scrollY + target.getBoundingClientRect().top - headerOffset() - 8;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: behavior || (REDUCED ? "auto" : "smooth"),
    });
  }

  function resolveTarget(hash) {
    if (!hash || hash === "#") return null;
    try {
      return document.querySelector(hash);
    } catch {
      return null;
    }
  }

  function samePageLink(link) {
    if (!link.hash) return false;
    if (link.origin !== window.location.origin) return false;
    return link.pathname.replace(/\/$/, "") === window.location.pathname.replace(/\/$/, "");
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[href*="#"]');
    if (!link || !samePageLink(link)) return;

    var target = resolveTarget(link.hash);
    if (!target) return;

    event.preventDefault();
    scrollToTarget(target);

    if (history.pushState) {
      history.pushState(null, "", link.hash);
    } else {
      window.location.hash = link.hash;
    }
  });

  function scrollOnLoad() {
    if (!window.location.hash) return;
    var target = resolveTarget(window.location.hash);
    if (!target) return;

    window.requestAnimationFrame(function () {
      scrollToTarget(target, REDUCED ? "auto" : "auto");
      window.setTimeout(function () {
        scrollToTarget(target, REDUCED ? "auto" : "smooth");
      }, 80);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scrollOnLoad);
  } else {
    scrollOnLoad();
  }
})();
