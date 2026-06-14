# Fundação — Consolidação de Design Tokens

**Data:** 2026-06-14
**Sub-projeto:** A (de A→B→C) — base compartilhada antes de polir site público (B) e painel admin (C)
**Status:** spec aprovado para planejamento

## Contexto

Projeto = clone estático do site EAD da Faculdade IDE (original WordPress/Elementor em `_capture/`),
mais um painel admin (CMS) em `admin/`. Existe um design system real em
[`assets/css/tokens.css`](../../../assets/css/tokens.css): paleta navy/teal, fontes Gotham/Inter,
escalas de espaçamento, raio e sombra.

Os tokens **já são usados** (417 ocorrências de `var(--)` no CSS do projeto: admin 192, home 56,
curso 58, components 43, base 28, rd-form 20). O problema não é ausência de sistema — é **adoção
incompleta** e **definições paralelas**:

- **103 cores hex literais** sobrevivem (76 no CSS público, 27 no admin) apesar dos tokens existirem.
- O admin define tokens **paralelos** com valores divergentes do site para o mesmo papel semântico:
  ```css
  /* admin/assets/css/admin.css:6 */
  --admin-danger:  #dc2626;   /* site público usa #e53935 — dois vermelhos */
  --admin-success: #059669;   /* curso.css usa #2e9e5b — dois verdes */
  --admin-sidebar-bg: linear-gradient(180deg, #2b325c 0%, #20264a 100%); /* literais, não var() */
  ```
- Falta a **camada semântica** (status success/danger/warning, superfícies neutras) — por isso cada
  arquivo inventou o próprio cinza/off-white. `#fafbfc` sozinho repete ~8× no admin; há 6 off-whites
  quase idênticos fazendo o mesmo trabalho de fundo de painel.

## Objetivo

Fonte única de verdade para cor. Eliminar literais e definições paralelas; adicionar a camada
semântica que falta; manter o design system existente (não substituir).

**Mudança visual esperada: ~zero.** As únicas mudanças intencionais de pixel são onde hoje existem
dois valores para o mesmo papel e eles colapsam num só (ver "Cores canônicas").

## Abordagem

**Merge conservador (#1).** Estende `tokens.css` com a camada semântica; troca literal→token onde o
valor já equivale a um token ou tem papel óbvio (status, superfície, accent). Colapsa neutros e status
duplicados. Deixa `#fff`/`#ffffff` como estão (inofensivo, alto ruído/baixo ganho tokenizar). One-offs
de marca que devem imitar terceiros ficam raw, com comentário.

Rejeitadas: normalização total (#2 — churn e risco altos por pouco ganho); mínima (#3 — deixa o débito
de neutros espalhado).

## Cores canônicas (decisões de merge)

Onde dois valores existem para um papel, o **canônico** vence; o outro deixa de existir:

| Papel | Canônico | Substitui | Notas |
|---|---|---|---|
| danger | `#dc2626` | `#e53935` (home.css:695) | valor do admin, mais limpo |
| success | `#059669` | `#2e9e5b` (curso.css:38) | valor do admin |
| danger-soft | `#fecaca` | `#ffb4b4` (rd-form.css:157) | |
| surface (fundo painel) | `#fafbfc` | `#f8f9fb` `#f9fafb` `#f8fafc` (admin) | colapso de off-whites |
| surface-2 | `#f3f4f6` | `#f6f8fa` (curso) `#f4f7fb` (rd-form) | nível levemente mais escuro |
| muted (texto secundário) | `#6b7280` (já existe) | `#444` `#555` `#616161` | um nível de cinza de texto |
| border | `#e3e8ee` (já existe) | `#dfdfdf` (home:313) `#e9e9e9` (home:435) | |
| accent-light | `#b8eef2` | `#aef0f5` (components:230) | tom teal claro |

## Mudanças em `tokens.css`

Adicionar ao `:root` (agrupadas por seção, seguindo o estilo do arquivo):

```css
/* ---- Semânticas de status ---- */
--color-success: #059669;  --color-success-soft: #d1fae5;
--color-danger:  #dc2626;  --color-danger-soft:  #fecaca;
--color-warning: #f59e0b;  --color-warning-soft: #fef3c7;

/* ---- Superfícies neutras ---- */
--color-surface:   #fafbfc;   /* fundo de painel/card claro */
--color-surface-2: #f3f4f6;   /* um nível mais escuro */
--color-app-bg:    #eef1f6;   /* fundo geral do app admin (era --admin-bg) */

/* ---- Variantes accent/primary ---- */
--color-accent-light:   #b8eef2;
--color-accent-bright:  #01e3f8;   /* par de gradiente em home (2 usos) */
--color-primary-darker: #151a30;   /* profundidade da sidebar admin */

/* ---- CTA laranja (marca) ---- */
--color-orange:       #F2791B;
--color-orange-light: #FBA94C;
```

## Mudanças por arquivo

### `admin/assets/css/admin.css`
- `--admin-bg` → remover; usar `var(--color-app-bg)`.
- `--admin-danger` / `--admin-success` → manter os **nomes** como aliases apontando ao shared
  (`--admin-danger: var(--color-danger)`) para não tocar os 192 usos existentes; remover os valores hex.
- `--admin-sidebar-bg` gradiente → `linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)`.
- `#151a30` (linhas 47, 1495) → `var(--color-primary-darker)`.
- `#b8eef2` (81, 332) → `var(--color-accent-light)`.
- `#fecaca` (356) → `var(--color-danger-soft)`; `#d1fae5` (743) → `var(--color-success-soft)`;
  `#fef3c7` (742) → `var(--color-warning-soft)`.
- Off-whites (565, 574, 676, 720, 724, 774, 963, 992, 1038, 1112, 1147, 1308) → `var(--color-surface)`
  ou `var(--color-surface-2)` conforme o tom.

### `assets/css/components.css`
- `#2B325C` (47) → `var(--color-primary)`.
- `#aef0f5` (230) → `var(--color-accent-light)`.
- `#d8d8d8` (497) → `var(--color-footer-rule)` (token já existente).

### `assets/css/home.css`
- `#13a6b4` (605, 625) → `var(--color-accent)`; `#01e3f8` (605, 625) → `var(--color-accent-bright)`.
- `#e53935` (695) → `var(--color-danger)`.
- `#dfdfdf` (313) `#e9e9e9` (435) → `var(--color-border)`; `#616161` (434, 717) → `var(--color-muted)`.

### `assets/css/curso.css`
- `#2e9e5b` (38) → `var(--color-success)`.
- `#f6f8fa` (170, 195, 232) → `var(--color-surface-2)`.
- `#444` (81, 171, 215) `#555` (104, 141, 208) → `var(--color-muted)`.

### `assets/css/rd-form.css`
- `#f4f7fb` (165) → `var(--color-surface-2)`; `#ffb4b4` (157) → `var(--color-danger-soft)`;
  `#1e2444` (189) → `var(--color-primary-dark)`.

### `assets/css/base.css`
- `.btn--orange` (94) → `linear-gradient(135deg, var(--color-orange-light), var(--color-orange))`.

## Exceções — ficam raw (com comentário `/* intencional: ... */`)

- **SERP preview** admin.css:1191-1193 `#1a0dab` `#006621` `#545454` — deve imitar cores do Google.
- **Estrela Google-review** home.css:549 `#fbbc04` — cor de marca do Google.
- **`#fff` / `#ffffff`** — mantidos como literais (decisão da abordagem #1).
- **Texto âmbar escuro** admin.css:742 `#92400e` — uso único de texto sobre warning-soft.

## Fora de escopo (fases B/C)

- Refator estrutural de CSS, dedup de regras, divisão de arquivos grandes.
- Qualquer mudança de layout, espaçamento, hierarquia ou responsividade visível.
- Polimento visual de componentes.

## Verificação (sem regressão de cor)

1. Antes: capturar estado visual de `index.html`, a página de curso em
   `pos-graduacao/aleitamento-materno-banco-leite-humano/index.html`, e o painel `admin/index.html`
   (login + cada aba).
2. Aplicar mudanças.
3. Depois: comparar. As **únicas** diferenças de cor permitidas são as merges da tabela "Cores
   canônicas" (vermelho→#dc2626, verde→#059669, cinzas consolidados). Qualquer outra diferença = bug.
4. Conferir que nenhum `var(--token)` ficou indefinido (todos os novos tokens existem em `tokens.css`).

## Critérios de sucesso

- `tokens.css` contém a camada semântica completa.
- Zero definições de cor paralelas (admin não tem mais valores hex próprios além de aliases).
- Literais hex restantes no CSS = só as exceções documentadas + `#fff`.
- Páginas visualmente idênticas exceto pelas merges canônicas intencionais.
