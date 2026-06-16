const SITE_URL = "https://ead.faculdadeide.edu.br";

/** Páginas de catálogo por nível de formação (menu principal). */
export const CATALOG_PAGES = {
  todos: {
    slug: "",
    path: "/paginas-de-cursos",
    menuLabel: "Todos os cursos",
    title: "Todos os cursos | EAD Faculdade IDE",
    heading: "Veja todos os cursos que temos disponíveis",
    description:
      "Explore o catálogo completo de pós-graduação, graduação e cursos de curta duração da Faculdade IDE — 100% EAD com aulas ao vivo.",
    nivelNome: "",
  },
  "pos-graduacao": {
    slug: "pos-graduacao",
    path: "/paginas-de-cursos/pos-graduacao",
    menuLabel: "Pós-Graduação",
    title: "Pós-Graduação EAD | Faculdade IDE",
    heading: "Pós-Graduação",
    description:
      "Conheça as pós-graduações EAD da Faculdade IDE: especializações com aulas ao vivo, corpo docente de referência e certificado reconhecido pelo MEC.",
    nivelNome: "Pós-Graduação",
  },
  graduacao: {
    slug: "graduacao",
    path: "/paginas-de-cursos/graduacao",
    menuLabel: "Graduação",
    title: "Graduação EAD | Faculdade IDE",
    heading: "Graduação",
    description:
      "Graduações EAD da Faculdade IDE com flexibilidade, aulas ao vivo e formação reconhecida pelo MEC.",
    nivelNome: "Graduação",
  },
  "curta-duracao": {
    slug: "curta-duracao",
    path: "/paginas-de-cursos/curta-duracao",
    menuLabel: "Curta Duração",
    title: "Cursos de Curta Duração EAD | Faculdade IDE",
    heading: "Curta Duração",
    description:
      "Cursos de curta duração EAD para atualização rápida e certificação profissional na Faculdade IDE.",
    nivelNome: "Curta duração",
  },
};

export function resolveCatalogPage(filterSlug) {
  const key = String(filterSlug || "").trim().toLowerCase();
  if (!key || key === "todos") return CATALOG_PAGES.todos;
  return CATALOG_PAGES[key] || null;
}

export function catalogCanonical(path) {
  return `${SITE_URL}${path}`;
}
