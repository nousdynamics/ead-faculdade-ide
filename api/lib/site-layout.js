/**
 * Header, footer e páginas de erro compartilhados entre home, cursos e 404.
 */
const SITE_URL = "https://ead.faculdadeide.edu.br";

export function renderHeader({ base = "", ctaHref = "#inscricao" } = {}) {
  return `<header class="site-header" id="topo">
    <div class="container site-header__inner">
      <a class="site-header__logo" href="/" aria-label="Faculdade IDE EAD — início">
        <img src="${base}assets/img/LOGO-IDE-ONLINE-02.svg" width="229" height="88" alt="Faculdade IDE EAD">
      </a>
      <nav class="site-nav__menu" aria-label="Menu principal">
        <a href="${SITE_URL}/paginas-de-cursos/">Pós-Graduação</a>
        <span class="site-nav__divider" aria-hidden="true"></span>
        <a href="${SITE_URL}/paginas-de-cursos/">Graduação</a>
        <span class="site-nav__divider" aria-hidden="true"></span>
        <a href="${SITE_URL}/paginas-de-cursos/">Curta Duração</a>
        <span class="site-nav__divider" aria-hidden="true"></span>
        <a href="${SITE_URL}/paginas-de-cursos/">Todos os cursos</a>
      </nav>
      <div class="site-nav__actions">
        <a class="site-header__login" href="https://institutode131845.rm.cloudtotvs.com.br/FrameHTML/web/app/edu/PortalEducacional/login/" target="_blank" rel="noopener">Já sou Aluno(a)</a>
        <a class="site-header__cta" href="${ctaHref}">inscreva-se</a>
      </div>
    </div>
  </header>`;
}

export function renderFooter({ base = "" } = {}) {
  return `<footer class="site-footer">
    <div class="container site-footer__grid">
      <div class="site-footer__col">
        <img class="site-footer__logo" src="${base}assets/img/LOGO-IDE-ONLINE-02.svg" alt="Faculdade IDE EAD">
        <div class="site-footer__block">
          <h3>Políticas</h3>
          <ul>
            <li><a href="${SITE_URL}/?page_id=773">Termos de uso</a></li>
            <li><a href="${SITE_URL}/?page_id=3">Política de privacidade</a></li>
          </ul>
        </div>
        <div class="site-footer__emec">
          <p>Consulte aqui o cadastro da Instituição no Sistema e-MEC</p>
          <img src="${base}assets/img/e-mec-qrcode.png" alt="QR Code e-MEC">
        </div>
      </div>
      <div class="site-footer__col site-footer__col--stack-sm">
        <div class="site-footer__block">
          <h3>Institucional</h3>
          <ul>
            <li><a href="https://www.faculdadeide.edu.br/quem-somos">Quem somos</a></li>
            <li><a href="https://www.faculdadeide.edu.br/biblioteca">Biblioteca</a></li>
          </ul>
        </div>
        <div class="site-footer__block site-footer__block--flush">
          <ul><li><a href="https://www.faculdadeide.edu.br/fale-conosco">Fale conosco</a></li></ul>
        </div>
      </div>
      <div class="site-footer__col">
        <div class="site-footer__block site-footer__block--tight">
          <h3>Nossos escritórios</h3>
          <p>Alferes José Pedro de Brito, 50<br>Farolândia<br>Aracaju/SE</p>
        </div>
        <div class="site-footer__block site-footer__block--tight">
          <h3>Contatos</h3>
          <p class="site-footer__phone"><a href="tel:08000813256">0800 081 3256*</a></p>
          <p class="site-footer__note">* O 0800 só é válido para ligações de telefone fixo, fora de Recife e Região Metropolitana</p>
          <p class="site-footer__phone"><a href="tel:08134650002">(81) 3465-0002</a></p>
        </div>
        <div class="site-footer__block">
          <h3>Redes Social</h3>
          <div class="social">
            <a href="https://www.instagram.com/faculdadeide" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.42.4.68.8.9 1.4.17.4.37 1 .42 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2a3.8 3.8 0 0 1-.9 1.4c-.4.42-.8.68-1.4.9-.4.17-1 .37-2.2.42-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42a3.8 3.8 0 0 1-1.4-.9 3.8 3.8 0 0 1-.9-1.4c-.17-.4-.37-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.22-.6.48-1 .9-1.4.4-.42.8-.68 1.4-.9.4-.17 1-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 1.8a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 1.8a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm5-3.2a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"/></svg></a>
            <a href="https://www.facebook.com/faculdadeide" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24"><path d="M13.5 21v-8.2h2.8l.42-3.2H13.5V7.5c0-.93.26-1.56 1.6-1.56h1.7V3.1c-.3-.04-1.3-.13-2.48-.13-2.46 0-4.14 1.5-4.14 4.25v2.37H7.4v3.2h2.28V21h3.82Z"/></svg></a>
            <a href="https://twitter.com/faculdadeide" target="_blank" rel="noopener" aria-label="Twitter / X"><svg viewBox="0 0 24 24"><path d="M17.7 3h3.3l-7.2 8.2L22.5 21h-6.6l-5.2-6.8L4.8 21H1.5l7.7-8.8L1.5 3h6.8l4.7 6.2L17.7 3Zm-1.2 16h1.8L7.6 4.9H5.7L16.5 19Z"/></svg></a>
          </div>
        </div>
      </div>
    </div>
    <div class="site-footer__rule" aria-hidden="true"></div>
    <div class="container site-footer__bottom">
      <p>© Faculdade IDE | Mude O Seu Mundo! 2024 • Todos os direitos reservados<br>CNPJ: 08.469.669/0001-39 — Instituto de Desenvolvimento Educacional</p>
      <a class="dev-by" href="https://wa.me/5571991065853?text=Eu%20quero%20um%20site%20para%20minha%20empresa!" target="_blank" rel="noopener">Desenvolvido por: <img src="${base}assets/img/Nous-Dynamics-Favicon-01.svg" alt="Nous Dynamics"></a>
    </div>
  </footer>`;
}

export function renderSiteMotionStyles({ base = "" } = {}) {
  return `<link rel="stylesheet" href="${base}assets/css/motion.css">`;
}

export function renderSiteLayoutScripts({ base = "" } = {}) {
  return `<script src="${base}assets/js/site-header-offset.js" defer></script>
  <script src="${base}assets/js/motion.js" defer></script>`;
}

export function render404Page({
  title = "Página não encontrada — EAD Faculdade IDE",
  heading = "404",
  message = "A página que você procura não existe ou foi movida.",
  base = "/",
} = {}) {
  const assetBase = base.endsWith("/") ? base : `${base}/`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="robots" content="noindex, follow">
  <link rel="icon" href="${assetBase}assets/img/FAV-ICON-3.svg" sizes="any">
  <link rel="stylesheet" href="${assetBase}assets/css/tokens.css">
  <link rel="stylesheet" href="${assetBase}assets/css/base.css">
  <link rel="stylesheet" href="${assetBase}assets/css/components.css">
  ${renderSiteMotionStyles({ base: assetBase })}
  <style>
    .not-found {
      flex: 1 0 auto;
      display: grid;
      place-content: center;
      text-align: center;
      padding: 2rem;
      gap: 1rem;
    }
    .not-found h1 { font-size: clamp(2rem, 5vw, 3rem); color: var(--color-primary); }
    .not-found p { color: var(--color-muted); max-width: 40ch; margin: 0 auto; }
  </style>
</head>
<body class="site-layout">
  ${renderHeader({ base: assetBase, ctaHref: "#inscricao" })}
  <main class="not-found">
    <h1>${heading}</h1>
    <p>${message}</p>
    <a class="btn btn--primary" href="/">Voltar para a home</a>
  </main>
  ${renderFooter({ base: assetBase })}
  ${renderSiteLayoutScripts({ base: assetBase })}
</body>
</html>`;
}
