# Clone fiel EAD Faculdade IDE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recriar fielmente a Home e a página de curso (Aleitamento Materno) da EAD Faculdade IDE em HTML/CSS/JS puro, mantível, baixando todos os assets local.

**Architecture:** Site estático, sem build. Design tokens em CSS custom properties; CSS dividido em tokens/base/components/home/curso; JS vanilla por feature. Componentes (header, footer, card, form, whatsapp) compartilhados entre páginas via include manual de markup.

**Tech Stack:** HTML5 semântico, CSS3 (custom properties, grid/flex), JavaScript vanilla. Sem dependências de build. Verificação por comparação visual/estrutural com o original.

**Nota sobre fidelidade:** O markup/CSS final é derivado do original capturado (Tarefa 1-2), não inventado. As tarefas de build descrevem o processo e os critérios de fidelidade; os valores exatos (cores, textos, medidas) vêm da captura.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Página Home completa |
| `pos-graduacao/aleitamento-materno-banco-leite-humano/index.html` | Página do curso |
| `assets/css/tokens.css` | Design tokens (cores, fontes, espaçamentos, breakpoints) |
| `assets/css/base.css` | Reset, tipografia base, helpers globais |
| `assets/css/components.css` | Header, footer, card de curso, botões, form, whatsapp |
| `assets/css/home.css` | Seções específicas da home |
| `assets/css/curso.css` | Seções específicas da página de curso |
| `assets/js/menu.js` | Navegação mobile (hamburguer) |
| `assets/js/course-filter.js` | Filtros do catálogo (área/status/modalidade) |
| `assets/js/form-stub.js` | Captura submit dos forms (placeholder) |
| `assets/js/testimonials.js` | Carrossel de depoimentos |
| `assets/img/` | Imagens baixadas |
| `assets/fonts/` | Fontes baixadas |
| `_capture/` | Originais baixados p/ referência (NÃO publicar; entra no .gitignore opcional) |

---

## Task 1: Capturar originais (home + curso)

**Files:**
- Create: `_capture/home.html`, `_capture/curso.html`
- Create: `_capture/css/*.css` (os ~29 CSS de cada página)
- Create: `_capture/manifest.txt` (lista de URLs de assets)

- [ ] **Step 1: Baixar os dois HTML**

Rodar fora do sandbox se houver "Connection reset" (servidor com WP Rocket/anti-bot). Usar PowerShell na máquina do usuário se necessário.
```bash
mkdir -p _capture/css
curl -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "https://ead.faculdadeide.edu.br/" -o _capture/home.html
curl -sL --max-time 60 -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" "https://ead.faculdadeide.edu.br/pos-graduacao/aleitamento-materno-e-banco-de-leite-humano-100-ead/" -o _capture/curso.html
```
Expected: dois arquivos, HTTP 200, home ~180 KB.

- [ ] **Step 2: Extrair lista de assets (CSS, JS, img, fontes) dos dois HTML**

```bash
grep -oiE 'href="[^"]+\.css[^"]*"|src="[^"]+\.(js|png|jpg|jpeg|webp|svg|gif|woff2?|ttf)[^"]*"' _capture/home.html _capture/curso.html \
  | sed -E 's/^[^"]*"//; s/"$//' | sort -u > _capture/manifest.txt
wc -l _capture/manifest.txt
```
Expected: manifest com dezenas de URLs.

- [ ] **Step 3: Baixar todos os CSS para `_capture/css/`**

```bash
grep -iE '\.css' _capture/manifest.txt | while read u; do
  [ "${u#http}" = "$u" ] && u="https://ead.faculdadeide.edu.br$u"
  curl -sL -A "Mozilla/5.0" "$u" -o "_capture/css/$(echo "$u" | md5sum | cut -c1-12).css"
done
ls _capture/css | wc -l
```
Expected: arquivos CSS baixados.

- [ ] **Step 4: Commit**

```bash
git add _capture && git commit -m "chore: captura dos originais (home + curso + css)"
```

---

## Task 2: Extrair design tokens

**Files:**
- Create: `assets/css/tokens.css`

- [ ] **Step 1: Extrair cores, fontes e medidas dos CSS capturados**

```bash
# cores
grep -ohiE '#[0-9a-f]{3,8}|rgba?\([^)]+\)' _capture/css/*.css _capture/home.html | sort | uniq -c | sort -rn | head -40
# fontes
grep -ohiE 'font-family[^;}]+' _capture/css/*.css | sort -u | head -30
# breakpoints
grep -ohiE '@media[^{]+' _capture/css/*.css | sort -u | head -30
```
Expected: paleta dominante, famílias de fonte, breakpoints do Elementor.

- [ ] **Step 2: Identificar fontes carregadas (Google Fonts / @font-face)**

```bash
grep -ohiE 'fonts.googleapis|@font-face|src:[^;]*\.(woff2?|ttf)' _capture/css/*.css _capture/home.html | sort -u
```

- [ ] **Step 3: Escrever `tokens.css`** com `:root { --color-*, --font-*, --space-*, --bp-* }` baseados nos valores extraídos.

- [ ] **Step 4: Commit**

```bash
git add assets/css/tokens.css && git commit -m "feat: design tokens extraídos do original"
```

---

## Task 3: Baixar imagens e fontes local

**Files:**
- Create: `assets/img/*`, `assets/fonts/*`

- [ ] **Step 1: Baixar imagens listadas no manifest**

```bash
mkdir -p assets/img assets/fonts
grep -iE '\.(png|jpg|jpeg|webp|svg|gif)' _capture/manifest.txt | while read u; do
  [ "${u#http}" = "$u" ] && u="https://ead.faculdadeide.edu.br$u"
  curl -sL -A "Mozilla/5.0" "$u" -o "assets/img/$(basename "${u%%\?*}")"
done
ls assets/img | wc -l
```

- [ ] **Step 2: Baixar fontes (woff/woff2/ttf) referenciadas**

```bash
grep -iE '\.(woff2?|ttf)' _capture/manifest.txt | while read u; do
  [ "${u#http}" = "$u" ] && u="https://ead.faculdadeide.edu.br$u"
  curl -sL -A "Mozilla/5.0" "$u" -o "assets/fonts/$(basename "${u%%\?*}")"
done
ls assets/fonts
```

- [ ] **Step 3: Visualizar amostra das imagens** (Read tool nas principais: logo, hero, ícones) p/ confirmar que baixaram íntegras.

- [ ] **Step 4: Commit**

```bash
git add assets/img assets/fonts && git commit -m "chore: assets (imagens + fontes) baixados local"
```

---

## Task 4: Base CSS + esqueleto HTML das duas páginas

**Files:**
- Create: `assets/css/base.css`
- Create: `index.html`, `pos-graduacao/aleitamento-materno-banco-leite-humano/index.html`

- [ ] **Step 1: Escrever `base.css`** — reset (box-sizing, margin 0), tipografia base usando tokens, container, helpers de espaçamento.

- [ ] **Step 2: Criar `index.html`** com `<head>` completo (charset, viewport, title "Home - Ead Faculdade IDE", meta description capturada, links p/ tokens.css+base.css+components.css+home.css) e `<body>` com comentários de seção (`<!-- HERO -->`, etc) vazios.

- [ ] **Step 3: Criar `pos-graduacao/.../index.html`** com `<head>` análogo (title/meta da página de curso, links p/ ...+curso.css) e body com comentários de seção.

- [ ] **Step 4: Abrir ambas no navegador** — confirmar que carregam sem erro 404 de CSS (DevTools console limpo).

- [ ] **Step 5: Commit**

```bash
git add assets/css/base.css index.html pos-graduacao && git commit -m "feat: base css + esqueleto das duas páginas"
```

---

## Task 5: Componente Header (compartilhado)

**Files:**
- Modify: `index.html`, `pos-graduacao/.../index.html` (inserir markup do header)
- Modify: `assets/css/components.css`
- Create: `assets/js/menu.js`

- [ ] **Step 1: Extrair markup/estrutura do header do original**

```bash
grep -n -iE 'header|site-header|elementor-location-header|<nav' _capture/home.html | head
```
Identificar logo, itens de menu, CTA.

- [ ] **Step 2: Escrever HTML semântico do header** (`<header><a logo><nav><ul>...</ul></nav><a cta></header>`) e inserir nas duas páginas (markup idêntico).

- [ ] **Step 3: Estilizar header em `components.css`** batendo cores/espaçamentos do original (tokens).

- [ ] **Step 4: Escrever `menu.js`** — toggle do menu mobile (hamburguer).

- [ ] **Step 5: Verificar no navegador** desktop + mobile (DevTools responsive) vs original.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: header compartilhado + menu mobile"
```

---

## Task 6: Componente Footer (compartilhado)

**Files:**
- Modify: `index.html`, `pos-graduacao/.../index.html`
- Modify: `assets/css/components.css`

- [ ] **Step 1: Extrair conteúdo do footer do original** (Políticas, Institucional, escritórios, contatos 0800/(81), redes sociais, parcelamento, selo e-MEC).

```bash
grep -n -iE 'footer|0800|e-MEC|newsletter' _capture/home.html | head -30
```

- [ ] **Step 2: Escrever HTML do footer** com os textos/links reais capturados; inserir nas duas páginas.

- [ ] **Step 3: Estilizar footer** em `components.css` (colunas, responsivo).

- [ ] **Step 4: Verificar no navegador** vs original.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: footer compartilhado"
```

---

## Task 7: Botão WhatsApp flutuante + form de contato (componentes)

**Files:**
- Modify: `assets/css/components.css`
- Create: `assets/js/form-stub.js`
- Modify: `index.html`, `pos-graduacao/.../index.html`

- [ ] **Step 1: Extrair link wa.me e markup do form do original**

```bash
grep -n -iE 'wa\.me|whatsapp|<form|wpcf7|input|textarea' _capture/home.html | head -30
```

- [ ] **Step 2: Adicionar botão WhatsApp flutuante** (link real `wa.me`) nas duas páginas + estilo.

- [ ] **Step 3: Escrever markup do form** (campos reais capturados) com `action="#"` e estilo fiel.

- [ ] **Step 4: Escrever `form-stub.js`** — `preventDefault`, mostra mensagem "envio a configurar" (placeholder p/ backend futuro).

- [ ] **Step 5: Verificar no navegador** — botão clica, form não recarrega página.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: whatsapp flutuante + form (stub)"
```

---

## Task 8: Home — Hero + "Porque escolher a Faculdade IDE?"

**Files:**
- Modify: `index.html`, `assets/css/home.css`

- [ ] **Step 1: Extrair markup/texto do hero e do bloco de benefícios**

```bash
grep -n -iE 'Excelência no ensino|Porque escolher' _capture/home.html
```

- [ ] **Step 2: Escrever HTML do hero** (headline, subheadline, imagem/CTA reais) na seção `<!-- HERO -->`.

- [ ] **Step 3: Escrever HTML do bloco "Porque escolher"** (ícones + textos de benefícios).

- [ ] **Step 4: Estilizar ambos em `home.css`** com layout/cores fiéis.

- [ ] **Step 5: Verificar no navegador** vs original (desktop + mobile).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: home hero + bloco benefícios"
```

---

## Task 9: Home — Catálogo de cursos com filtros

**Files:**
- Modify: `index.html`, `assets/css/home.css`, `assets/css/components.css`
- Create: `assets/js/course-filter.js`

- [ ] **Step 1: Extrair todos os cards de curso e os filtros do original**

```bash
grep -n -iE 'Pós-Graduação|Área de interesse|Filtro de Status|preferencia por' _capture/home.html | head -40
```
Capturar: título de cada curso, área, status, modalidade, link.

- [ ] **Step 2: Escrever markup do card de curso** em `components.css` + um card por curso capturado no `index.html` (com data-attributes: `data-area`, `data-status`, `data-modalidade`).

- [ ] **Step 3: Escrever markup dos filtros** (área de interesse, status, modalidade) acima do grid.

- [ ] **Step 4: Escrever `course-filter.js`** — filtra cards por data-attributes conforme seleção.

- [ ] **Step 5: Estilizar grid + cards + filtros** fiel ao original.

- [ ] **Step 6: Verificar no navegador** — filtros escondem/mostram cards corretamente; visual igual.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: home catálogo de cursos + filtros"
```

---

## Task 10: Home — Depoimentos (stub TrustIndex) + Newsletter

**Files:**
- Modify: `index.html`, `assets/css/home.css`
- Create: `assets/js/testimonials.js`

- [ ] **Step 1: Capturar depoimentos visíveis no original** (nomes, textos, notas) p/ stub estático.

```bash
grep -n -iE 'Depoimento|trustindex|newsletter|Receba nossa' _capture/home.html | head
```

- [ ] **Step 2: Escrever seção de depoimentos** (cards estáticos com os depoimentos capturados) — substitui o widget TrustIndex.

- [ ] **Step 3: Escrever `testimonials.js`** — carrossel simples (prev/next ou auto-scroll).

- [ ] **Step 4: Escrever seção newsletter** ("Receba nossa newsletter" + input email, action stub).

- [ ] **Step 5: Estilizar ambos** fiel ao original.

- [ ] **Step 6: Verificar no navegador** — carrossel funciona, visual igual.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: home depoimentos (stub) + newsletter"
```

---

## Task 11: Página do curso (Aleitamento Materno)

**Files:**
- Modify: `pos-graduacao/aleitamento-materno-banco-leite-humano/index.html`, `assets/css/curso.css`

- [ ] **Step 1: Mapear seções reais da página de curso**

```bash
grep -n -oiE '<h[1-3][^>]*>.*?</h[1-3]>' _capture/curso.html | sed -E 's/<[^>]+>//g' | head -40
grep -n -iE 'duração|modalidade|investimento|disciplinas|coordenação|matrícula|carga horária' _capture/curso.html | head -30
```
Confirmar seções (hero+form, dados do curso, disciplinas, coordenação, CTA).

- [ ] **Step 2: Escrever HTML de cada seção** do curso com textos/dados reais capturados (header/footer/whatsapp já vêm dos componentes).

- [ ] **Step 3: Estilizar em `curso.css`** fiel ao original.

- [ ] **Step 4: Verificar no navegador** vs original (desktop + mobile).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: página do curso Aleitamento Materno"
```

---

## Task 12: Responsivo + tracking placeholder + verificação final

**Files:**
- Modify: todos os CSS conforme necessário; ambos os HTML (comentário de tracking)

- [ ] **Step 1: Conferir breakpoints** (mobile/tablet/desktop) das duas páginas no DevTools responsive vs original; ajustar CSS onde divergir.

- [ ] **Step 2: Inserir bloco de tracking comentado** no `<head>` das duas páginas:
```html
<!-- TRACKING (reativar nas melhorias): GTM + Facebook Pixel. IDs no _capture/. -->
```
Extrair IDs do original p/ deixar registrado:
```bash
grep -oiE 'GTM-[A-Z0-9]+|fbq\([^)]*\)|facebook[^"]*pixel[^"]*' _capture/home.html | sort -u
```

- [ ] **Step 3: Varredura de links/assets quebrados** — abrir ambas as páginas, DevTools console + Network sem 404.

- [ ] **Step 4: Comparação final lado a lado** com o original (estrutura de seções + fidelidade visual). Listar divergências e corrigir.

- [ ] **Step 5: Escrever `README.md`** curto — como abrir/servir o site, o que é stub, o que falta p/ produção (backend form, tracking).

- [ ] **Step 6: Commit final**

```bash
git add -A && git commit -m "feat: responsivo + tracking placeholder + README + verificação"
```

---

## Self-Review (cobertura do spec)

- Rebuild limpo HTML/CSS/JS → Tarefas 4-11 ✓
- Assets local → Tarefa 3 ✓
- Design idêntico → tokens (T2) + verificação visual em cada tarefa + T12 ✓
- Componentes compartilhados (header/footer/card/whatsapp/form) → T5-T7, T9 ✓
- Home (7 seções) → T8-T10 ✓
- Página de curso → T11 ✓
- Dinâmicos stub (form/trustindex/whatsapp/tracking) → T7, T10, T12 ✓
- Responsivo → T12 ✓
- Fora de escopo (backend, tracking real, outras páginas) → respeitado ✓
