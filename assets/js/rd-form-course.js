(function () {
  var RD_SCRIPT = "https://d335luupugsy2.cloudfront.net/js/rdstation-forms/stable/rdstation-forms.min.js";
  var booted = new Set();

  function loadRdScript() {
    return new Promise(function (resolve) {
      if (typeof RDStationForms !== "undefined") {
        resolve();
        return;
      }

      var existing = document.querySelector('script[src*="rdstation-forms"]');
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", function () {
          existing.dataset.loaded = "true";
          resolve();
        });
        return;
      }

      var script = document.createElement("script");
      script.src = RD_SCRIPT;
      script.defer = true;
      script.addEventListener("load", function () {
        script.dataset.loaded = "true";
        resolve();
      });
      document.body.appendChild(script);
    });
  }

  function waitForRdForm(formId, attempts) {
    return new Promise(function (resolve) {
      var left = attempts || 50;

      function tick() {
        if (document.getElementById(formId)) {
          resolve(true);
          return;
        }
        left -= 1;
        if (left <= 0) {
          resolve(false);
          return;
        }
        setTimeout(tick, 100);
      }

      tick();
    });
  }

  function hideEmbeddedRdTitles(formId) {
    var root = document.getElementById(formId);
    if (!root) return;

    root.querySelectorAll('[id^="rd-row-"]').forEach(function (row) {
      if (row.querySelector(".bricks-form__field, .bricks-form, input, select, textarea")) return;
      if (!row.querySelector('[id^="rd-text-"], [id^="rd-heading-"]')) return;
      row.hidden = true;
      row.setAttribute("aria-hidden", "true");
    });
  }

  function watchEmbeddedRdTitles(formId) {
    var root = document.getElementById(formId);
    if (!root) return;

    hideEmbeddedRdTitles(formId);

    var observer = new MutationObserver(function () {
      hideEmbeddedRdTitles(formId);
    });

    observer.observe(root, { childList: true, subtree: true });

    window.setTimeout(function () {
      hideEmbeddedRdTitles(formId);
      observer.disconnect();
    }, 3000);
  }

  function initRdForm(formId) {
    if (!formId) {
      return Promise.resolve();
    }

    if (booted.has(formId)) {
      hideEmbeddedRdTitles(formId);
      return Promise.resolve();
    }

    return loadRdScript().then(function () {
      if (typeof RDStationForms === "undefined") return;
      return waitForRdForm(formId).then(function (ready) {
        if (!ready || booted.has(formId)) return;
        new RDStationForms(formId, "null").createForm();
        booted.add(formId);
        watchEmbeddedRdTitles(formId);
      });
    });
  }

  function openDialog(dialog) {
    if (!(dialog instanceof HTMLDialogElement)) return Promise.resolve();

    var formId = dialog.dataset.rdFormId || "";
    var show = function () {
      if (typeof dialog.showModal === "function") dialog.showModal();
    };

    if (!formId) {
      show();
      return Promise.resolve();
    }

    return initRdForm(formId).then(function () {
      hideEmbeddedRdTitles(formId);
      show();
    });
  }

  function shouldUseInvestmentModal(trigger, dialog) {
    if (!trigger || !(dialog instanceof HTMLDialogElement)) return false;
    if (trigger.hasAttribute("data-open-investment-modal")) return true;
    return Boolean(dialog.dataset.rdFormId);
  }

  function bindDialog(dialog, triggerSelector) {
    if (!(dialog instanceof HTMLDialogElement)) return;

    document.querySelectorAll(triggerSelector).forEach(function (trigger) {
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        openDialog(dialog);
      });
    });

    dialog.querySelector(".course-rd-modal__close")?.addEventListener("click", function () {
      dialog.close();
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      dialog.close();
    });
  }

  function bindInvestmentDelegation() {
    var dialog = document.getElementById("course-investment-modal");
    if (!(dialog instanceof HTMLDialogElement)) return;

    document.addEventListener(
      "click",
      function (event) {
        var trigger = event.target.closest("[data-open-investment-modal], .course-investment__cta");
        if (!trigger || !shouldUseInvestmentModal(trigger, dialog)) return;

        event.preventDefault();
        event.stopPropagation();
        openDialog(dialog);
      },
      true,
    );
  }

  function initInlineForms() {
    document.querySelectorAll("[data-rd-inline-form]").forEach(function (wrap) {
      var formId = wrap.dataset.rdFormId || "";
      if (!formId) return;
      initRdForm(formId).then(function () {
        watchEmbeddedRdTitles(formId);
      });
    });
  }

  function boot() {
    initInlineForms();
    bindDialog(document.getElementById("course-guide-modal"), "[data-open-guide-modal]");
    bindDialog(document.getElementById("course-investment-modal"), "[data-open-investment-modal]");
    bindInvestmentDelegation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
