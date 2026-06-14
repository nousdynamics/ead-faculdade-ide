// menu.js — toggle do menu mobile (hamburguer)
(function () {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  if (!toggle || !nav) return;

  function close() {
    nav.classList.remove('is-open');
    toggle.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    toggle.classList.toggle('is-active', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('nav-open', open);
  });

  // Fecha ao clicar num link do menu
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', close);
  });

  // Fecha ao redimensionar para desktop
  window.addEventListener('resize', function () {
    if (window.innerWidth > 1024) close();
  });
})();
