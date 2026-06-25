/**
 * Cliente Supabase Auth para páginas de aluno.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

let clientPromise;

async function loadConfig() {
  if (window.__SUPABASE__?.url && window.__SUPABASE__?.anonKey) {
    return window.__SUPABASE__;
  }

  const res = await fetch("/api/config/public");
  if (!res.ok) throw new Error("Autenticação indisponível.");
  return res.json();
}

export async function getSupabaseClient() {
  if (!clientPromise) {
    clientPromise = loadConfig().then((cfg) => createClient(cfg.url, cfg.anonKey));
  }
  return clientPromise;
}

export async function getSession() {
  const supabase = await getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser() {
  const supabase = await getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function signOut() {
  const supabase = await getSupabaseClient();
  await supabase.auth.signOut();
}

const ACCESS_LABELS = {
  basic: "Básico (somente leitura)",
  super_admin: "Super admin",
};

function formatAccessLevel(level) {
  return ACCESS_LABELS[level] || level || "—";
}

function setMessage(el, text, type = "") {
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("auth-form__msg--error", type === "error");
  el.classList.toggle("auth-form__msg--success", type === "success");
}

function redirectAfterLogin() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    window.location.href = next;
    return;
  }
  window.location.href = "/minha-conta";
}

async function handleLogin(form, msgEl) {
  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email || !password) {
    setMessage(msgEl, "Preencha e-mail e senha.", "error");
    return;
  }

  setMessage(msgEl, "Entrando…");
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    setMessage(msgEl, translateAuthError(error.message), "error");
    return;
  }

  redirectAfterLogin();
}

async function handleRegister(form, msgEl) {
  const fullName = form.fullName.value.trim();
  const email = form.email.value.trim();
  const phone = form.phone.value.trim();
  const password = form.password.value;
  const passwordConfirm = form.passwordConfirm.value;

  if (!fullName || !email || !password) {
    setMessage(msgEl, "Preencha nome, e-mail e senha.", "error");
    return;
  }

  if (password.length < 8) {
    setMessage(msgEl, "A senha deve ter pelo menos 8 caracteres.", "error");
    return;
  }

  if (password !== passwordConfirm) {
    setMessage(msgEl, "As senhas não coincidem.", "error");
    return;
  }

  setMessage(msgEl, "Criando conta…");
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, phone },
    },
  });

  if (error) {
    setMessage(msgEl, translateAuthError(error.message), "error");
    return;
  }

  if (data.session) {
    redirectAfterLogin();
    return;
  }

  setMessage(
    msgEl,
    "Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.",
    "success",
  );
  form.reset();
}

async function handleReset(form, msgEl) {
  const email = form.email.value.trim();
  if (!email) {
    setMessage(msgEl, "Informe seu e-mail.", "error");
    return;
  }

  setMessage(msgEl, "Enviando…");
  const supabase = await getSupabaseClient();
  const redirectTo = `${window.location.origin}/auth/callback`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    setMessage(msgEl, translateAuthError(error.message), "error");
    return;
  }

  setMessage(msgEl, "Se o e-mail existir, enviamos um link de recuperação.", "success");
  form.reset();
}

async function loadAccountPage() {
  const panel = document.getElementById("auth-account-panel");
  const loading = document.getElementById("auth-account-loading");
  const loadingMsg = loading?.querySelector(".auth-card__lead");

  try {
    const session = await getSession();

    if (!session) {
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/entrar?next=${next}`;
      return;
    }

    const supabase = await getSupabaseClient();
    const user = session.user;
    const fullNameEl = document.getElementById("account-full-name");
    const emailEl = document.getElementById("account-email");
    const phoneReadonlyEl = document.getElementById("account-phone-readonly");
    const accessLevelEl = document.getElementById("account-access-level");
    const readonlyNotice = document.getElementById("account-readonly-notice");
    const cmsNotice = document.getElementById("account-cms-notice");
    const profileForm = document.getElementById("auth-profile-form");
    const profileMsg = document.getElementById("auth-profile-msg");
    const phoneInput = document.getElementById("profile-phone");

    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("full_name, phone, access_level")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const fullName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Aluno(a)";

    const phone = profile?.phone || user.user_metadata?.phone || "—";
    const accessLevel = profile?.access_level || "basic";
    const isSuperAdmin = accessLevel === "super_admin";

    if (fullNameEl) fullNameEl.textContent = fullName;
    if (emailEl) emailEl.textContent = user.email || "—";
    if (phoneReadonlyEl) phoneReadonlyEl.textContent = phone;
    if (accessLevelEl) accessLevelEl.textContent = formatAccessLevel(accessLevel);

    if (isSuperAdmin) {
      if (cmsNotice) cmsNotice.hidden = false;
      if (profileForm) profileForm.hidden = false;
      if (phoneInput) phoneInput.value = phone === "—" ? "" : phone;
    } else {
      if (readonlyNotice) readonlyNotice.hidden = false;
    }

    if (loading) loading.hidden = true;
    if (panel) panel.hidden = false;

    profileForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!isSuperAdmin) {
        setMessage(profileMsg, "Seu acesso é somente leitura.", "error");
        return;
      }

      const nextPhone = profileForm.phone.value.trim();
      setMessage(profileMsg, "Salvando…");

      const { error } = await supabase
        .from("user_profiles")
        .update({ phone: nextPhone, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) {
        setMessage(profileMsg, "Não foi possível salvar. Tente novamente.", "error");
        return;
      }

      if (phoneReadonlyEl) phoneReadonlyEl.textContent = nextPhone || "—";
      setMessage(profileMsg, "Telefone atualizado.", "success");
    });

    document.getElementById("auth-logout-btn")?.addEventListener("click", async () => {
      await signOut();
      window.location.href = "/entrar";
    });
  } catch (err) {
    if (loadingMsg) {
      loadingMsg.textContent = "Não foi possível carregar sua conta. Tente entrar novamente.";
    }
    console.error(err);
    setTimeout(() => {
      window.location.href = "/entrar?next=" + encodeURIComponent(window.location.pathname);
    }, 1800);
  }
}

function translateAuthError(message) {
  const map = {
    "Invalid login credentials": "E-mail ou senha incorretos.",
    "User already registered": "Este e-mail já está cadastrado.",
    "Password should be at least 6 characters.": "A senha deve ter pelo menos 6 caracteres.",
    "Email not confirmed": "Confirme seu e-mail antes de entrar.",
  };
  return map[message] || "Não foi possível concluir. Tente novamente.";
}

function bindForm(id, handler) {
  const form = document.getElementById(id);
  if (!form) return;
  const msgEl = form.querySelector(".auth-form__msg") || document.getElementById(`${id.replace("-form", "-msg")}`);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await handler(form, msgEl);
    } catch {
      setMessage(msgEl, "Erro de conexão. Tente novamente.", "error");
    }
  });
}

const page = document.body.dataset.authPage;

if (page === "login") {
  bindForm("auth-login-form", handleLogin);
  getSession().then((session) => {
    if (session) redirectAfterLogin();
  });
}

if (page === "register") {
  bindForm("auth-register-form", handleRegister);
}

if (page === "reset") {
  bindForm("auth-reset-form", handleReset);
}

if (page === "account") {
  loadAccountPage();
}

async function handleAuthCallback() {
  const supabase = await getSupabaseClient();
  const query = new URLSearchParams(window.location.search);
  const code = query.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      window.location.href = "/entrar?error=confirm";
      return;
    }
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (hash.get("type") === "recovery") {
    window.location.href = "/redefinir-senha" + window.location.hash;
    return;
  }

  const session = await getSession();
  window.location.href = session ? "/minha-conta" : "/entrar";
}

async function handleNewPassword(form, msgEl) {
  const password = form.password.value;
  const passwordConfirm = form.passwordConfirm.value;

  if (password.length < 8) {
    setMessage(msgEl, "A senha deve ter pelo menos 8 caracteres.", "error");
    return;
  }

  if (password !== passwordConfirm) {
    setMessage(msgEl, "As senhas não coincidem.", "error");
    return;
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    setMessage(msgEl, translateAuthError(error.message), "error");
    return;
  }

  setMessage(msgEl, "Senha atualizada. Redirecionando…", "success");
  window.setTimeout(() => {
    window.location.href = "/minha-conta";
  }, 800);
}

if (page === "callback") {
  handleAuthCallback();
}

if (page === "new-password") {
  bindForm("auth-new-password-form", handleNewPassword);
}

export { getSession, signOut };
