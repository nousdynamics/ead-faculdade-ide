/**
 * Eventos de dataLayer p/ GTM (GTM-WCSJXXTX) — performance de anúncios.
 * Eventos: cta_inscricao_click, guide_modal_open, rd_form_submit.
 */
(function () {
  function push(data) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  }

  var curso =
    (location.pathname.match(/^\/(?:pos-graduacao|graduacao|curta-duracao)\/([^/]+)/) || [])[1] || "";

  document.addEventListener(
    "click",
    function (event) {
      var el = event.target.closest(
        "a.site-header__cta, .course-investment__cta, [data-open-investment-modal], [data-open-guide-modal], .elementor-button[href]",
      );
      if (!el) return;

      var local = "hero";
      if (el.matches("a.site-header__cta")) local = "header";
      else if (el.closest(".course-investment")) local = "investimento";
      else if (el.hasAttribute("data-open-guide-modal")) local = "guia";

      push({
        event: el.hasAttribute("data-open-guide-modal") ? "guide_modal_open" : "cta_inscricao_click",
        cta_local: local,
        curso: curso,
        cta_texto: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
      });
    },
    true,
  );

  document.addEventListener(
    "submit",
    function (event) {
      var form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      var wrap = form.closest("[data-rd-inline-form], .course-rd-modal");
      if (!wrap) return;

      var tipo = wrap.matches("[data-rd-inline-form]") || wrap.closest(".course-guide")
        ? "guia"
        : "investimento";

      push({ event: "rd_form_submit", form_tipo: tipo, curso: curso });
    },
    true,
  );
})();
