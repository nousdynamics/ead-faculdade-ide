// menu.js — painel do menu (hambúrguer, conforme Menu.json)
(function () {
  var openBtn = document.getElementById('menuOpen');
  var closeBtn = document.getElementById('menuClose');
  var menu = document.getElementById('siteMenu');
  var backdrop = document.getElementById('menuBackdrop');
  if (!openBtn || !menu) return;

  function setOpen(open) {
    menu.hidden = !open;
    openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('menu-open', open);
    if (open) closeBtn && closeBtn.focus();
    else openBtn.focus();
  }

  function close() { setOpen(false); }

  openBtn.addEventListener('click', function () { setOpen(true); });
  closeBtn && closeBtn.addEventListener('click', close);
  backdrop && backdrop.addEventListener('click', close);

  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', close);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) close();
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024 && !menu.hidden) close();
  });
})();
