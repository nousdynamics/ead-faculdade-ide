/**
 * Atualiza o link "Entrar" / "Minha conta" no header conforme sessão Supabase.
 */
import { getSession } from "./user-auth.js";

async function updateHeaderAuthLink() {
  const link = document.querySelector(".site-header__login");
  if (!link) return;

  try {
    const session = await getSession();
    if (session) {
      link.textContent = "Minha conta";
      link.href = "/minha-conta";
      link.removeAttribute("target");
      link.removeAttribute("rel");
    } else {
      link.textContent = "Entrar";
      link.href = "/entrar";
      link.removeAttribute("target");
      link.removeAttribute("rel");
    }
  } catch {
    link.textContent = "Entrar";
    link.href = "/entrar";
  }
}

updateHeaderAuthLink();
