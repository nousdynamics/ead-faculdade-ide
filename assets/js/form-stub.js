// form-stub.js — intercepta envio dos formulários (placeholder até integrar backend)
(function () {
  var forms = document.querySelectorAll('form[data-stub]');
  forms.forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('.form-msg');
      if (msg) {
        msg.textContent = 'Recebemos seus dados! Em breve entraremos em contato.';
        msg.classList.add('is-success');
      }
      form.reset();
      // TODO (melhorias): enviar para backend / RD Station / e-mail.
    });
  });
})();
