/** Menu lateral do painel — drawer no mobile */
(function () {
  var admin = document.getElementById("app");
  var toggle = document.getElementById("admin-nav-toggle");
  var overlay = document.getElementById("admin-nav-overlay");
  if (!admin || !toggle) return;

  function setOpen(open) {
    admin.classList.toggle("admin--nav-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("admin-nav-lock", open);
    if (overlay) {
      overlay.hidden = !open;
      overlay.setAttribute("aria-hidden", open ? "false" : "true");
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(!admin.classList.contains("admin--nav-open"));
  });

  overlay?.addEventListener("click", function () {
    setOpen(false);
  });

  document.getElementById("nav")?.addEventListener("click", function (e) {
    if (e.target.closest("a[href^='#/']")) setOpen(false);
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 767) setOpen(false);
  });
})();
