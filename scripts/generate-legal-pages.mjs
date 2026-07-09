/**
 * Gera as páginas estáticas de Termos de Uso e Política de Privacidade
 * usando o layout compartilhado do site (header/footer).
 *
 * Uso: node scripts/generate-legal-pages.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  renderFooter,
  renderGtmBody,
  renderGtmHead,
  renderHeader,
  renderSiteLayoutScripts,
  renderSiteMotionStyles,
} from "../lib/site-layout.js";

const SITE_URL = "https://ead.faculdadeide.edu.br";
const CNPJ = "08.469.669/0001-39";
const LEGAL_NAME = "Instituto de Desenvolvimento Educacional";
const CONTACT = "WhatsApp (81) 99108-2998";

const TERMS_SECTIONS = [
  ["1. Aceitação dos termos", [
    `Estes Termos de Uso regulam o acesso e a utilização do site ${SITE_URL} ("Site"), mantido pela Faculdade IDE — ${LEGAL_NAME}, CNPJ ${CNPJ}. Ao navegar pelo Site, preencher formulários ou realizar inscrições, você declara ter lido, compreendido e aceito integralmente estes termos.`,
  ]],
  ["2. Finalidade do site", [
    "O Site apresenta o catálogo de cursos EAD da Faculdade IDE (pós-graduação, graduação e cursos de curta duração), permite o download de materiais informativos, o envio de dados para contato comercial e o encaminhamento a ambientes de inscrição e pagamento.",
  ]],
  ["3. Inscrições e informações de cursos", [
    "As informações de cursos (valores, datas de início, carga horária, corpo docente e condições promocionais) podem ser atualizadas a qualquer momento, sem aviso prévio. O valor e as condições válidos são os vigentes no momento da efetivação da matrícula.",
    "A conclusão da inscrição e a formalização da matrícula podem ocorrer em plataformas próprias da Faculdade IDE, regidas por contrato de prestação de serviços educacionais específico.",
  ]],
  ["4. Propriedade intelectual", [
    "Todo o conteúdo do Site — marcas, logotipos, textos, imagens, vídeos, layout e materiais de divulgação — pertence à Faculdade IDE ou a seus licenciantes e é protegido pela legislação de propriedade intelectual. É proibida a reprodução, distribuição ou uso comercial sem autorização prévia e expressa.",
  ]],
  ["5. Responsabilidades do usuário", [
    "O usuário compromete-se a fornecer informações verdadeiras nos formulários, a não utilizar o Site para fins ilícitos e a não tentar violar mecanismos de segurança, interferir no funcionamento do Site ou acessar áreas restritas sem autorização.",
  ]],
  ["6. Limitação de responsabilidade", [
    "A Faculdade IDE emprega esforços razoáveis para manter o Site disponível e as informações corretas, mas não garante operação ininterrupta ou livre de erros. Links para sites de terceiros são fornecidos por conveniência; a Faculdade IDE não se responsabiliza pelo conteúdo ou pelas práticas de privacidade desses sites.",
  ]],
  ["7. Privacidade e proteção de dados", [
    `O tratamento de dados pessoais coletados pelo Site é descrito na nossa <a href="/politica-de-privacidade">Política de Privacidade</a>, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).`,
  ]],
  ["8. Alterações destes termos", [
    "Estes Termos de Uso podem ser atualizados a qualquer momento. A versão vigente estará sempre publicada nesta página, com aplicação imediata a partir da publicação.",
  ]],
  ["9. Contato e foro", [
    `Dúvidas sobre estes termos podem ser encaminhadas pelo ${CONTACT}. Fica eleito o foro da comarca de Recife/PE para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.`,
  ]],
];

const PRIVACY_SECTIONS = [
  ["1. Quem somos", [
    `Esta Política de Privacidade descreve como a Faculdade IDE — ${LEGAL_NAME}, CNPJ ${CNPJ} ("nós"), controladora dos dados, coleta, utiliza e protege os dados pessoais de visitantes do site ${SITE_URL}, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).`,
  ]],
  ["2. Quais dados coletamos", [
    "<strong>Dados fornecidos por você:</strong> nome, e-mail, telefone/WhatsApp e curso de interesse, informados em formulários de contato, download de guias de curso e pré-inscrição.",
    "<strong>Dados coletados automaticamente:</strong> endereço IP, tipo de navegador, páginas visitadas e interações, por meio de cookies e ferramentas de análise e publicidade (como Google Tag Manager/Google Analytics e pixels de redes sociais).",
  ]],
  ["3. Para que usamos os dados", [
    "Responder a solicitações de contato e enviar materiais solicitados (como o guia do curso); realizar ações de marketing e relacionamento sobre cursos e ofertas, inclusive por WhatsApp e e-mail; mensurar a performance do site e de campanhas publicitárias; cumprir obrigações legais e regulatórias.",
  ]],
  ["4. Bases legais", [
    "Tratamos dados com fundamento no consentimento (envio de formulários), na execução de procedimentos preliminares a contrato (pré-inscrição e matrícula), no legítimo interesse (métricas e melhoria do site) e no cumprimento de obrigação legal, conforme o caso.",
  ]],
  ["5. Compartilhamento", [
    "Os dados podem ser compartilhados com fornecedores que operam em nosso nome — plataformas de automação de marketing (ex.: RD Station), hospedagem e infraestrutura (ex.: Vercel, Supabase), ferramentas de análise e publicidade (ex.: Google, Meta) — sempre limitado ao necessário para as finalidades descritas. Não vendemos dados pessoais.",
  ]],
  ["6. Cookies", [
    "Utilizamos cookies essenciais (funcionamento do site) e cookies de análise/publicidade (medição de audiência e campanhas). Você pode gerenciar cookies nas configurações do seu navegador; a desativação de alguns cookies pode afetar funcionalidades do site.",
  ]],
  ["7. Retenção e segurança", [
    "Mantemos os dados pelo tempo necessário às finalidades desta política ou por exigência legal, e adotamos medidas técnicas e organizacionais razoáveis para protegê-los contra acesso não autorizado, perda ou alteração.",
  ]],
  ["8. Seus direitos (LGPD)", [
    "Você pode solicitar a confirmação de tratamento, o acesso, a correção, a anonimização, a portabilidade e a eliminação dos seus dados, além de revogar consentimentos e se opor a tratamentos baseados em legítimo interesse. Para exercer esses direitos, fale conosco pelos canais indicados abaixo.",
  ]],
  ["9. Contato do encarregado (DPO)", [
    `Solicitações relacionadas a dados pessoais podem ser feitas pelo ${CONTACT} ou pelos canais institucionais da Faculdade IDE. Responderemos no prazo previsto na legislação aplicável.`,
  ]],
  ["10. Atualizações desta política", [
    "Esta política pode ser revisada periodicamente. A versão vigente estará sempre disponível nesta página.",
  ]],
];

function renderSections(sections) {
  return sections
    .map(
      ([title, paragraphs]) => `      <section class="legal-page__section">
        <h2>${title}</h2>
        ${paragraphs.map((p) => `<p>${p}</p>`).join("\n        ")}
      </section>`,
    )
    .join("\n");
}

function renderLegalPage({ title, heading, description, path, sections }) {
  const base = "/";
  const pageUrl = `${SITE_URL}${path}`;
  const updated = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  ${renderGtmHead()}
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${pageUrl}">
  <link rel="icon" href="/assets/img/FAV-ICON-3.svg" sizes="any">
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/components.css">
  <link rel="stylesheet" href="/assets/css/responsive.css">
  ${renderSiteMotionStyles({ base })}
  <style>
    .legal-page { flex: 1 0 auto; padding: calc(var(--site-header-offset) + var(--space-lg)) 0 var(--space-xl); }
    .legal-page__inner { max-width: 820px; margin: 0 auto; padding: 0 var(--container-pad); }
    .legal-page h1 { color: var(--color-primary); font-size: clamp(1.75rem, 4vw, 2.5rem); margin: 0 0 .5rem; }
    .legal-page__updated { color: var(--color-muted); font-size: .875rem; margin: 0 0 var(--space-lg); }
    .legal-page__section { margin-bottom: var(--space-md); }
    .legal-page__section h2 { color: var(--color-primary); font-size: 1.15rem; margin: 0 0 .5rem; }
    .legal-page__section p { color: var(--color-text-body); line-height: 1.7; margin: 0 0 .75rem; }
    .legal-page__section a { color: var(--color-accent-deep); }
  </style>
</head>
<body class="site-layout">
  ${renderGtmBody()}
  ${renderHeader({ base, ctaHref: "/paginas-de-cursos" })}
  <main class="legal-page">
    <div class="legal-page__inner">
      <h1>${heading}</h1>
      <p class="legal-page__updated">Última atualização: ${updated}</p>
${renderSections(sections)}
    </div>
  </main>
  ${renderFooter({ base })}
  ${renderSiteLayoutScripts({ base })}
</body>
</html>
`;
}

const PAGES = [
  {
    dir: "termos-de-uso",
    html: renderLegalPage({
      title: "Termos de Uso | EAD Faculdade IDE",
      heading: "Termos de Uso",
      description: "Termos de uso do site EAD da Faculdade IDE — condições de navegação, inscrições e propriedade intelectual.",
      path: "/termos-de-uso",
      sections: TERMS_SECTIONS,
    }),
  },
  {
    dir: "politica-de-privacidade",
    html: renderLegalPage({
      title: "Política de Privacidade | EAD Faculdade IDE",
      heading: "Política de Privacidade",
      description: "Política de privacidade da Faculdade IDE — como coletamos, usamos e protegemos seus dados pessoais (LGPD).",
      path: "/politica-de-privacidade",
      sections: PRIVACY_SECTIONS,
    }),
  },
];

for (const page of PAGES) {
  const dir = join(process.cwd(), page.dir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), page.html, "utf8");
  console.log(`✓ ${page.dir}/index.html`);
}
