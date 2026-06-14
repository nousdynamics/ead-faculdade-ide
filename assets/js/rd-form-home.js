(function () {
  var FORM_ID = "home-site-ead-3e90cfebb8378f18fbf8";

  function patchSpamCopy() {
    var spamEl = document.querySelector("#rd-text-mo0jfhof p span");
    if (spamEl && spamEl.textContent.indexOf("SPAM") !== -1) {
      spamEl.textContent =
        "Você vai falar com um consultor da Faculdade IDE e receber informações sobre os e condições exclusivas para iniciar sua pós.";
    }
  }

  var formBootAttempts = 0;

  function initForm() {
    if (typeof RDStationForms === "undefined") {
      formBootAttempts += 1;
      if (formBootAttempts < 50) setTimeout(initForm, 100);
      return;
    }
    new RDStationForms(FORM_ID, "null").createForm();

    var target = document.getElementById(FORM_ID);
    if (!target) return;

    var observer = new MutationObserver(patchSpamCopy);
    observer.observe(target, { childList: true, subtree: true });

    var attempts = 0;
    var interval = setInterval(function () {
      patchSpamCopy();
      attempts += 1;
      if (attempts > 20) clearInterval(interval);
    }, 300);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initForm);
  } else {
    initForm();
  }
})();
