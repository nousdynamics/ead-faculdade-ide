/**
 * Renderiza HTML de páginas de pós-graduação a partir dos dados do CMS.
 * Template Elementor: data/templates/pos-graduacao.elementor.json
 */
const SITE_URL = "https://ead.faculdadeide.edu.br";
const GUIDE_IMG = "assets/img/IMG-GUIA-DO-CURSO-01.webp";
const ARROW_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const CARD_ARROW =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function assetUrl(path, base = "../../") {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${base}${path.replace(/^\//, "")}`;
}

function absUrl(path) {
  if (!path) return SITE_URL;
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}/${path.replace(/^\//, "")}`;
}

function byId(list, id) {
  return list.find((item) => item.id === id) || null;
}

function youtubeEmbed(url) {
  if (!url) return "";
  const value = String(url).trim();
  const match = value.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (!match) return "";
  return `https://www.youtube.com/embed/${match[1]}`;
}

function renderJsonLd(course, faq) {
  const canonical = course.seo?.canonical || `/pos-graduacao/${course.slug}`;
  const pageUrl = absUrl(canonical);
  const image = absUrl(course.imagem_capa);
  const graph = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Pós-Graduação", item: `${SITE_URL}/#cursos` },
        { "@type": "ListItem", position: 3, name: course.titulo, item: pageUrl },
      ],
    },
    {
      "@type": "Course",
      name: course.titulo,
      description: course.seo?.description || course.subtitulo || course.titulo,
      provider: { "@type": "EducationalOrganization", name: "Faculdade IDE", url: `${SITE_URL}/` },
      courseMode: "online",
      educationalLevel: "Pós-Graduação Lato Sensu",
      inLanguage: "pt-BR",
      url: pageUrl,
      image,
      offers: {
        "@type": "Offer",
        category: "Pós-Graduação EAD",
        url: course.hero?.link_botao || course.investimento?.link_botao || pageUrl,
      },
    },
  ];

  if (faq?.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.slice(0, 8).map((item) => ({
        "@type": "Question",
        name: item.pergunta,
        acceptedAnswer: { "@type": "Answer", text: item.resposta.replace(/<[^>]+>/g, " ") },
      })),
    });
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2);
}

function renderHeader(base) {
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
        <a class="site-header__cta" href="#investimento">inscreva-se</a>
      </div>
    </div>
  </header>`;
}

function renderFooter(base) {
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

export function renderCoursePage(course, ctx) {
  const base = "../../";
  const info = course.informacoes || {};
  const hero = course.hero || {};
  const sobre = course.sobre || {};
  const inv = course.investimento || {};
  const seo = course.seo || {};
  const canonical = seo.canonical || `/pos-graduacao/${course.slug}`;
  const pageUrl = absUrl(canonical);
  const status = byId(ctx.statuses, course.status_curso_id);
  const statusLabel = status?.nome || "Inscrições Abertas";
  const statusColor = status?.cor || "#13A6B4";
  const inscricaoLink = hero.link_botao || inv.link_botao || "#investimento";
  const coverImg = assetUrl(course.imagem_capa, base);
  const ogImage = absUrl(course.imagem_capa);

  const infoItems = [
    { label: "Carga horária", value: info.carga_horaria },
    { label: "Duração", value: info.duracao },
    { label: "Início previsto", value: info.inicio_previsto },
    { label: "Vagas", value: info.vagas },
    { label: "Modalidade", value: info.modalidade },
    { label: "Aulas", value: info.aulas },
  ].filter((item) => item.value);

  const coordCards = (course.coordenacao_ids || [])
    .map((id) => byId(ctx.coordination, id))
    .filter(Boolean)
    .map(
      (coord) => `<aside class="coord-card">
          <img class="coord-card__photo" src="${assetUrl(coord.foto, base)}" alt="${escapeHtml(coord.nome)}">
          <p class="coord-card__name">${escapeHtml(coord.nome)}</p>
          <p class="coord-card__role">${escapeHtml(coord.cargo || "")}</p>
          ${
            coord.mini_curriculo?.length
              ? `<details class="coord-card__cv"><summary>Mini-currículo</summary><ul>${coord.mini_curriculo.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul></details>`
              : ""
          }
        </aside>`,
    )
    .join("");

  const modulos = (course.modulos || [])
    .map(
      (mod) => `<details class="accordion__item"><summary>${escapeHtml(mod.titulo)}</summary><div class="accordion__content"><ul>${(mod.itens || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></details>`,
    )
    .join("");

  const audience = (course.publico_alvo || [])
    .filter((item) => item?.texto)
    .map((item) => `<div class="course-audience__item">${escapeHtml(item.texto)}</div>`)
    .join("");

  const professors = (course.professor_ids || [])
    .map((id) => byId(ctx.professors, id))
    .filter(Boolean)
    .map(
      (prof) => `<figure class="faculty-card"><img src="${assetUrl(prof.foto, base)}" alt="${escapeHtml(prof.nome)}" loading="lazy"><figcaption class="faculty-card__name">${escapeHtml(prof.nome)}</figcaption></figure>`,
    )
    .join("");

  const testimonials = (course.depoimento_ids || [])
    .map((id) => byId(ctx.testimonials, id))
    .filter(Boolean)
    .map(
      (dep) => `<blockquote class="course-quote__card">
          <p class="course-quote__name">${escapeHtml(dep.nome)}</p>
          <p class="course-quote__role">${escapeHtml(dep.profissao || dep.legenda || "")}</p>
          <p class="course-quote__text">${escapeHtml(dep.texto || dep.legenda || "")}</p>
        </blockquote>`,
    )
    .join("");

  const faq = (course.faq || [])
    .map(
      (item) => `<details class="accordion__item"><summary>${escapeHtml(item.pergunta)}</summary><div class="accordion__content"><p>${escapeHtml(item.resposta)}</p></div></details>`,
    )
    .join("");

  const related = ctx.courses
    .filter((c) => c.id !== course.id && c.publicado !== false)
    .slice(0, 4)
    .map((rel) => {
      const relPath = rel.seo?.canonical || `/pos-graduacao/${rel.slug}`;
      return `<article class="course-card">
          <img class="course-card__img" src="${assetUrl(rel.imagem_capa, base)}" alt="${escapeHtml(rel.titulo)}" loading="lazy">
          <div class="course-card__body">
            <span class="course-card__tag">Pós-Graduação</span>
            <h3 class="course-card__title">${escapeHtml(rel.titulo)}</h3>
            <a class="course-card__btn" href="${escapeHtml(relPath.startsWith("/") ? relPath : `/${relPath}`)}">Conhecer o curso ${CARD_ARROW}</a>
          </div>
        </article>`;
    })
    .join("");

  const embed = youtubeEmbed(info.video);
  const videoBlock = embed
    ? `<div class="course-about__video"><iframe src="${embed}" title="Vídeo promocional — ${escapeHtml(course.titulo)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`
    : `<p class="course-about__video-placeholder">Cadastre o link do YouTube em &quot;Vídeo promocional&quot; no painel do curso.</p>`;

  const heroPills = [
    info.carga_horaria,
    info.duracao,
    info.modalidade?.includes("EAD") ? "Online" : info.modalidade,
  ].filter(Boolean);

  const infobarItems = [
    info.inicio_previsto && { label: `Início previsto ${info.inicio_previsto}` },
    info.aulas && { label: info.aulas },
    { label: "Plataforma interativa" },
    { label: "Reconhecido pelo e-MEC" },
  ].filter(Boolean);

  const extraAccordions = [];
  if (coordCards) {
    extraAccordions.push(
      `<details class="accordion__item"><summary>Coordenação pedagógica</summary><div class="accordion__content course-about__coord-wrap">${coordCards}</div></details>`,
    );
  }
  if (professors) {
    extraAccordions.push(
      `<details class="accordion__item"><summary>Corpo docente</summary><div class="accordion__content"><div class="faculty-grid faculty-grid--compact">${professors}</div></div></details>`,
    );
  }
  if (course.matriz_curricular) {
    extraAccordions.push(
      `<details class="accordion__item"><summary>Matriz curricular</summary><div class="accordion__content">${course.matriz_curricular}</div></details>`,
    );
  }
  if (course.destaques) {
    extraAccordions.push(
      `<details class="accordion__item"><summary>Destaques do curso</summary><div class="accordion__content">${course.destaques}</div></details>`,
    );
  }
  if (course.objetivos) {
    extraAccordions.push(
      `<details class="accordion__item"><summary>Objetivos do curso</summary><div class="accordion__content">${course.objetivos}</div></details>`,
    );
  }

  const extraAccordionSection =
    extraAccordions.length > 0
      ? `<section class="course-details"><div class="container"><div class="accordion accordion--2col">${extraAccordions.join("")}</div></div></section>`
      : "";

  return `<!DOCTYPE html>
<html lang="pt-BR" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(seo.title || `${course.titulo} | Pós-Graduação EAD — Faculdade IDE`)}</title>
  <meta name="description" content="${escapeHtml(seo.description || course.subtitulo || "")}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Ead Faculdade IDE">
  <meta property="og:title" content="${escapeHtml(seo.og_title || seo.title || course.titulo)}">
  <meta property="og:description" content="${escapeHtml(seo.og_description || seo.description || "")}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(seo.title || course.titulo)}">
  <meta name="twitter:description" content="${escapeHtml(seo.description || "")}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="icon" href="${base}assets/img/FAV-ICON-3.svg" sizes="any">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <script type="application/ld+json">${renderJsonLd(course, course.faq)}</script>
  <link rel="stylesheet" href="${base}assets/css/tokens.css">
  <link rel="stylesheet" href="${base}assets/css/base.css">
  <link rel="stylesheet" href="${base}assets/css/components.css">
  <link rel="stylesheet" href="${base}assets/css/curso.css">
</head>
<body>
  ${renderHeader(base)}
  <main>
    <section class="course-hero">
      <div class="container course-hero__inner">
        <div class="course-hero__content">
          <p class="course-hero__level">Pós-Graduação</p>
          <h1 class="course-hero__title">${escapeHtml(course.titulo)}</h1>
          ${course.subtitulo ? `<p class="course-hero__subtitle">${escapeHtml(course.subtitulo)}</p>` : ""}
          ${
            heroPills.length
              ? `<div class="course-hero__pills">${heroPills.map((pill) => `<span class="course-hero__pill">${escapeHtml(pill)}</span>`).join('<span class="course-hero__pill-sep" aria-hidden="true"></span>')}</div>`
              : ""
          }
          <a class="btn btn--orange" href="${escapeHtml(inscricaoLink)}" target="_blank" rel="noopener">${escapeHtml(hero.texto_botao || "Inscreva-se")} ${ARROW_SVG}</a>
        </div>
        <div class="course-hero__media">
          <span class="course-hero__badge" style="--status-color:${escapeHtml(statusColor)}">${escapeHtml(statusLabel)}</span>
          <img src="${coverImg}" alt="${escapeHtml(course.titulo)}" loading="eager">
        </div>
      </div>
    </section>

    ${
      infobarItems.length
        ? `<section class="course-infobar"><div class="container course-infobar__inner">${infobarItems
            .map((item) => `<div class="course-infobar__item"><span>${escapeHtml(item.label)}</span></div>`)
            .join("")}</div></section>`
        : ""
    }

    <section class="course-about">
      <div class="container">
        <span class="course-about__tag">${escapeHtml(sobre.tag || "Conheça o curso")}</span>
        <div class="course-about__inner">
          ${videoBlock}
          ${coordCards || ""}
        </div>
      </div>
    </section>

    <div class="course-program">
    ${modulos ? `<section class="course-learn"><div class="container"><h2>O que você vai aprender:</h2><div class="accordion accordion--2col">${modulos}</div></div></section>` : ""}

    <section class="course-guide">
      <div class="container course-guide__inner">
        <div class="course-guide__text">
          <h2>Baixe o guia do seu curso e entenda tudo sobre ele</h2>
          <ul class="course-guide__list">
            <li>Como funcionam as aulas e atividades avaliativas</li>
            <li>Ementa das disciplinas</li>
            <li>Conheça o Ambiente Virtual de Aprendizagem</li>
            <li>Perguntas Frequentes</li>
          </ul>
          <a class="btn btn--white" href="#investimento">Baixe o guia do curso ${ARROW_SVG}</a>
        </div>
        <div class="course-guide__media">
          <img src="${assetUrl(GUIDE_IMG, base)}" alt="Guia do curso no celular" loading="lazy">
        </div>
      </div>
    </section>

    ${
      audience
        ? `<section class="course-audience"><div class="container"><h2>Esse curso é para quem:</h2><div class="course-audience__grid">${audience}</div></div></section>`
        : ""
    }
    </div>

    ${extraAccordionSection}

    ${
      infoItems.length
        ? `<section class="course-info-grid"><div class="container"><h2 class="course-info-grid__title">Informações importantes</h2><div class="course-info-grid__items">${infoItems
            .map(
              (item) => `<article class="course-info-grid__item"><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.value)}</p></article>`,
            )
            .join("")}</div></div></section>`
        : ""
    }

    ${professors ? `<section class="course-faculty"><div class="container"><h2>Conheça os professores que são referência</h2><div class="faculty-grid">${professors}</div></div></section>` : ""}

    ${testimonials ? `<section class="course-quote"><div class="container"><h2>O que nossos alunos dizem</h2>${testimonials}</div></section>` : ""}

    <section class="course-invest" id="investimento">
      <div class="container course-invest__inner">
        <div>
          <h2>Com esse investimento, você garante:</h2>
          <ul class="course-invest__list">${(inv.beneficios || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
        </div>
        <div class="price-card">
          <p class="price-card__label">${escapeHtml(inv.oferta_label || "Condições de pagamento")}</p>
          <p class="price-card__value">${escapeHtml(inv.oferta_valor || "")}</p>
          ${inv.taxa_inscricao ? `<p class="price-card__fee">${escapeHtml(inv.taxa_inscricao)}</p>` : ""}
          <a class="btn btn--orange" href="${escapeHtml(inv.link_botao || inscricaoLink)}" target="_blank" rel="noopener">${escapeHtml(inv.texto_botao || "Quero me matricular")} ${ARROW_SVG}</a>
          <div class="price-card__links">
            <a href="#">Confira outras opções de parcelamento.</a>
            <a href="#">Confira descontos especiais.</a>
          </div>
        </div>
      </div>
    </section>

    ${faq ? `<section class="course-faq"><div class="container"><h2>FAQ — Perguntas Frequentes</h2><div class="accordion">${faq}</div></div></section>` : ""}

    ${related ? `<section class="course-related"><div class="container"><h2>Cursos que você pode se interessar:</h2><div class="course-grid">${related}</div><p class="course-related__more"><a class="btn btn--ghost" href="/#cursos">Veja mais opções ${CARD_ARROW}</a></p></div></section>` : ""}
  </main>
  ${renderFooter(base)}
</body>
</html>`;
}
