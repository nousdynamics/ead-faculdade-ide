import { setSession } from "./auth.js";

const form = document.getElementById("register-form");
const errorEl = document.getElementById("register-error");

function showError(message) {
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = !message;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");

  const email = form.email.value.trim();
  const password = form.password.value;
  const passwordConfirm = form.passwordConfirm.value;

  if (!email || !password) {
    showError("Preencha e-mail e senha.");
    return;
  }

  if (password.length < 8) {
    showError("A senha deve ter pelo menos 8 caracteres.");
    return;
  }

  if (password !== passwordConfirm) {
    showError("As senhas não coincidem.");
    return;
  }

  const submitBtn = form.querySelector(".login-submit");
  submitBtn?.classList.add("is-loading");
  submitBtn?.setAttribute("disabled", "disabled");

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(data.error || "Não foi possível criar a conta.");
      return;
    }

    setSession(data.token, data.user, data.email || email, data.accessLevel);
    window.location.href = "/admin";
  } catch {
    showError("Erro de conexão. Tente novamente.");
  } finally {
    submitBtn?.classList.remove("is-loading");
    submitBtn?.removeAttribute("disabled");
  }
});
