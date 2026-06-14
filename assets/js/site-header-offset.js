(function () {
  var header = document.querySelector(".site-header");
  if (!header) return;

  function syncOffset() {
    document.documentElement.style.setProperty("--site-header-offset", header.offsetHeight + "px");
  }

  syncOffset();

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(syncOffset).observe(header);
  } else {
    window.addEventListener("resize", syncOffset, { passive: true });
  }
})();
