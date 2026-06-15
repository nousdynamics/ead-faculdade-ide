// course-filter.js — filtra os cards do catálogo por nível / área / status
(function () {
  var grid = document.getElementById('courseGrid');
  if (!grid) return;

  var selNivel  = document.getElementById('f-nivel');
  var selArea   = document.getElementById('f-area');
  var selStatus = document.getElementById('f-status');
  var cards = [];
  var empty = grid.querySelector('.course-grid__empty');
  var bound = false;

  function norm(s) { return (s || '').trim().toLowerCase(); }

  function apply() {
    cards = Array.prototype.slice.call(grid.querySelectorAll('.course-card'));
    var n = norm(selNivel && selNivel.value);
    var a = norm(selArea && selArea.value);
    var s = norm(selStatus && selStatus.value);
    var visible = 0;

    cards.forEach(function (card) {
      var okN = !n || norm(card.dataset.nivel) === n;
      var okA = !a || norm(card.dataset.area) === a;
      var okS = !s || norm(card.dataset.status) === s;
      var show = okN && okA && okS;
      card.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });

    if (empty) empty.hidden = visible !== 0;

    if (window.SiteMotion && typeof window.SiteMotion.refreshCourseGrid === "function") {
      window.SiteMotion.refreshCourseGrid();
    }
  }

  function bindFilters() {
    if (bound) return;
    bound = true;
    [selNivel, selArea, selStatus].forEach(function (el) {
      if (el) el.addEventListener('change', apply);
    });
  }

  function init() {
    bindFilters();
    apply();
  }

  grid.addEventListener('catalog:ready', init);
})();
