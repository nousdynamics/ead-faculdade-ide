(function () {
  var header = document.querySelector(".site-header");
  if (!header) return;

  var toggle = header.querySelector(".site-nav__toggle");
  var panel = header.querySelector("#site-nav-panel");
  if (!toggle || !panel) return;

  var label = toggle.querySelector(".sr-only");
  var mq = window.matchMedia("(max-width: 991px)");

  function setOpen(open) {
    var isOpen = Boolean(open);
    header.classList.toggle("site-header--nav-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    if (label) label.textContent = isOpen ? "Fechar menu" : "Abrir menu";
    document.body.classList.toggle("site-nav-lock", isOpen);
  }

  function close() {
    setOpen(false);
  }

  toggle.addEventListener("click", function () {
    setOpen(!header.classList.contains("site-header--nav-open"));
  });

  panel.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", close);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") close();
  });

  document.addEventListener("click", function (event) {
    if (!header.classList.contains("site-header--nav-open")) return;
    if (header.contains(event.target)) return;
    close();
  });

  function onViewportChange() {
    if (!mq.matches) close();
  }

  if (typeof mq.addEventListener === "function") {
    mq.addEventListener("change", onViewportChange);
  } else if (typeof mq.addListener === "function") {
    mq.addListener(onViewportChange);
  }

  window.addEventListener("resize", onViewportChange, { passive: true });
})();
