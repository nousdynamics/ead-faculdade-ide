# Checklist da reunião (Nous × Faculdade IDE) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans para implementar tarefa a tarefa. Passos usam checkbox (`- [ ]`).

**Goal:** Corrigir todos os itens do checklist da reunião + bugs de backend encontrados no code-review, e publicar em produção (Vercel) via commit+push no branch `clone-fiel`.

**Architecture:** Site estático gerado por renderers em `lib/` (páginas de curso via `npm run generate:all`), API serverless Vercel (`api/handler.js` → `lib/router.js`), painel admin SPA vanilla (`admin/assets/js/app.js`), dados CMS em Supabase (espelho `data/cms/*.json`), mídia em Supabase Storage (bucket `cms-media`).

**Tech Stack:** Node ESM, vanilla JS, CSS tokens (`assets/css/tokens.css`), Supabase (`@supabase/supabase-js`), Vercel.

## Global Constraints

- Sem framework novo; seguir padrão vanilla + template literals existente.
- Cores/typography só via tokens de `assets/css/tokens.css` (navy `#2B325C`, teal `#13A6B4`, laranja `#F2791B`, Gotham).
- Páginas estáticas de curso são geradas: alterações de renderer exigem `npm run generate:all` antes do commit final.
- `index.html` e `404.html` são estáticos — editar manualmente em espelho das mudanças do `lib/site-layout.js`.
- Textos user-facing em pt-BR.
- Não quebrar contrato da API (`/api/cms/*`, `/api/media/*`).
- Uploads via JSON base64 têm limite prático ~3 MB (body Vercel 4.5 MB); vídeo usa signed upload URL direto no Supabase.

---

### Task 1: Backend — rota logout, validação POST CMS

**Files:** Modify `lib/router.js`
- Adicionar rota `if (a === "auth" && b === "logout" && !c) return handleAuthLogout(req, res);` junto às demais rotas auth (após linha 33).
- Em `handleCmsCollection` POST: rejeitar payload null/não-objeto (espelho da guarda do PUT linha 228) e exigir `id` string não vazia.
- Verify: `node --check lib/router.js` + teste manual com mock req/res.

### Task 2: Layout global — CTA maiúsculo, ano automático, redes sociais, links de políticas

**Files:** Modify `lib/site-layout.js`, `lib/social-icons.js`, `assets/css/components.css`, `index.html`, `404.html`
- `renderHeader`: texto CTA já minúsculo "inscreva-se" → CSS `text-transform: uppercase` em `.site-header__cta` (sem mudar função).
- `renderFooter`: ano dinâmico `new Date().getFullYear()` + `<span data-footer-year>` com script inline de atualização no cliente (páginas estáticas antigas continuam corretas).
- `social-icons.js`: remover entrada `x` de `SOCIAL_LINKS` e `BRAND_PATHS`; adicionar `youtube` com path Simple Icons e href `https://www.youtube.com/c/FaculdadeIDE`.
- Footer: links de Termos/Privacidade → `/termos-de-uso` e `/politica-de-privacidade` (páginas locais, Task 3). Atualizar `data/site.json` (`sameAs` sem twitter, com YouTube; `privacyPolicy`/`termsOfUse` locais).
- Espelhar footer/social em `index.html` e `404.html` (footer do 404 vem do renderer? 404.html é estático — editar).

### Task 3: Páginas Termos de Uso e Política de Privacidade

**Files:** Create `termos-de-uso/index.html`, `politica-de-privacidade/index.html`; Modify `sitemap.xml` (via script), `vercel.json` se necessário (rotas estáticas funcionam por pasta).
- Conteúdo LGPD padrão institucional (CNPJ 08.469.669/0001-39, WhatsApp (81) 99108-2998), layout do site (header/footer), `assets/css` tokens.
- Motivo: URLs WP atuais (`?page_id=773`, `?page_id=3`) servem certificado inválido de host estranho (brasil101-9080.com.br) — quebradas.

### Task 4: Página de curso — form guia exposto, público-alvo, banner, vídeo fallback, CTA header

**Files:** Modify `lib/render-course-page.js`, `assets/css/course-guide.css`, `assets/css/rd-form-course.css`, `assets/js/rd-form-course.js`, `data/site.json`
- `renderHeader({ ctaHref })`: passar `inscricaoLink` (mesmo link do investimento) em vez de `#investimento` fixo.
- `renderGuideSection`: embutir formulário RD inline (`guide.mountHtml`) na seção em card branco com contraste sobre o gradiente teal; manter CTA como fallback quando não há embed. `rd-form-course.js`: inicializar RD form inline no load (não só ao abrir modal).
- Público-alvo: renderizar `item.imagem` (ícone) e `item.titulo` quando presentes — hoje só `texto` é renderizado (bug "não aparece ícone nem título").
- Banner complementar: suportar `secao_complementar.imagem_mobile`, `formato` (`full|contido`), `margem` (px) via `<picture>` + style vars; admin ganha campos (Task 6).
- Vídeo fallback: `site.json.institutionalVideo` — se curso sem `info.video`, usar vídeo institucional (mecanismo pronto; URL configurável).

### Task 5: Admin — buscas/filtros, switch publicar, bugs de duplicação

**Files:** Modify `admin/assets/js/app.js`, `admin/assets/css` (admin.css — verificar nome)
- Busca na lista de cursos (`renderCoursesList`): input filtra por título/slug/área/nível (client-side).
- Busca nas listas de professores/coordenação/depoimentos (`renderEntityList`/`renderTestimonialsList`).
- Busca dentro dos entity-pickers do form de curso (`checkboxGroupPaginated`): input filtra itens, some com paginação durante busca — cobre "filtro de coordenador ao editar cursos".
- Switch publicar/despublicar na coluna "Publicado" da lista de cursos: toggle salva `publicado` via `upsertItem` (republica página).
- Bug form duplicado: `bindEntityEvents` insere `#entity-form-panel` sem remover o existente → remover antes de inserir (novo e editar).
- Bug nomes duplicados: normalizar (trim, espaços, acentos, caixa) e bloquear duplicata em professores/coordenação/depoimentos e em título de curso, com toast claro.

### Task 6: Admin — campo curso no cadastro de professor/coordenador + campos banner

**Files:** Modify `admin/assets/js/app.js`
- Forms de professor e coordenador ganham picker de cursos (checkbox list). No save: além do upsert da entidade, atualizar `professor_ids`/`coordenacao_ids` dos cursos marcados/desmarcados (batch `saveCollection("courses")`).
- Form de curso, seção público-alvo: já tem imagem/título — ok (bug era só no renderer).
- Seção complementar: adicionar upload `secao_complementar_imagem_mobile`, select `formato`, input numérico `margem` e coletar em `collectCourseForm`.

### Task 7: Upload nativo de vídeo (Supabase) para depoimentos

**Files:** Modify `lib/router.js`, `lib/image-storage.js`; Create rota `media/signed-upload`; Modify `admin/assets/js/upload.js`, `admin/assets/js/app.js` (form depoimento), `lib/testimonial-templates.js`
- Backend: rota POST `/api/media/signed-upload` (auth write) → `createSignedUploadUrl` no bucket, retorna `{ path, token, publicUrl }`. Aceitar `video/mp4`, `video/webm` até 200 MB.
- Admin: campo "Vídeo do depoimento (upload)" no form; upload direto ao Supabase via signed URL com barra de status; grava caminho público em `video_url`.
- Render: `buildAdaptiveBlocks` — quando `video_url` não é YouTube e termina em .mp4/.webm (ou é URL do storage), renderizar `<video controls preload="metadata">` em vez de iframe. Gera "link de embed" utilizável.
- Supabase: garantir bucket `cms-media` público (verificar via MCP; criar se preciso).

### Task 8: Tracking extra (GTM dataLayer)

**Files:** Modify `assets/js/course-page.js` (ou novo `assets/js/tracking.js` incluído no layout), `lib/render-course-page.js`
- Push de eventos `dataLayer`: `cta_inscricao_click` (hero/header/investimento, com curso), `guide_form_open`, `rd_form_submit` (listener em submit dos forms RD). GTM `GTM-WCSJXXTX` já instalado — eventos ficam disponíveis p/ triggers de anúncio.

### Task 9: Regeneração e publicação

- `npm run generate:all` (páginas de curso + sitemap).
- `node --check` em todos os .js tocados; smoke test do dev server (`node scripts/cms-server.mjs` + curl endpoints).
- Commits por tarefa; push `origin clone-fiel` ao final.

## Fora de escopo/decisões
- URL do vídeo institucional: mecanismo pronto; valor real a preencher pelo cliente em `data/site.json` (não inventar vídeo).
- Página de catálogo (`lib/render-catalog-page.js`) usa mesmo header — herda CTA default `#inscricao` na home/catálogo (sem curso, mantém comportamento atual).
