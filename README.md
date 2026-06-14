# Clone EAD Faculdade IDE

Site estático (HTML/CSS/JS puro) recriado a partir do original em [ead.faculdadeide.edu.br](https://ead.faculdadeide.edu.br/).

## Páginas

| Arquivo | Descrição |
|---|---|
| `index.html` | Home |
| `pos-graduacao/aleitamento-materno-banco-leite-humano/index.html` | Página do curso Aleitamento Materno |

## Como visualizar (local)

```bash
npm run dev
# ou: python -m http.server 8080
```

Acesse `http://localhost:8080/`.

## Deploy na Vercel

Site estático **sem build** — a Vercel publica os arquivos HTML/CSS/JS diretamente da raiz do repositório.

### Configuração do projeto (dashboard ou CLI)

| Campo | Valor |
|---|---|
| Framework Preset | **Other** |
| Root Directory | `.` (raiz) |
| Build Command | *(vazio)* |
| Output Directory | *(vazio)* |
| Install Command | *(vazio)* |

### Primeiro deploy (CLI)

```bash
npm i -g vercel
vercel login
vercel link
vercel deploy          # preview
vercel deploy --prod   # produção
```

Ou use os scripts do `package.json`:

```bash
npm run deploy:preview
npm run deploy:prod
```

### Arquivos de deploy

- `vercel.json` — clean URLs, cache de assets, headers de segurança
- `.vercelignore` — exclui `_capture/` e `docs/` do upload (referência local)
- `404.html` — página de erro customizada

### URLs após o deploy

| Rota | Página |
|---|---|
| `/` | Home |
| `/pos-graduacao/aleitamento-materno-banco-leite-humano` | Curso Aleitamento Materno |

(`cleanUrls` ativo — não é necessário `/index.html` na URL.)

## Estrutura de assets

- `assets/css/` — tokens, base, componentes, home e curso
- `assets/js/` — menu mobile, filtros de cursos, formulários (stub), carrossel de depoimentos
- `assets/img/` — imagens baixadas do original
- `_capture/` — HTML/CSS originais para referência (não publicar)

## Stubs (placeholder para produção)

| Feature | Status |
|---|---|
| Formulário hero | RD Station (`rd-form-home.js` + `rd-form.css`) |
| Formulários newsletter | `form-stub.js` — captura submit e exibe mensagem; sem backend |
| Depoimentos Google (TrustIndex) | Cards estáticos + carrossel em `testimonials.js` |
| Inscrição no curso | Links para `inscricao.faculdadeide.edu.br` |
| Tracking (GTM / Pixel) | Comentário no `<head>`; reativar nas melhorias |
| WhatsApp flutuante | **Não incluído** — original não possui botão flutuante |

## Fora de escopo

- Backend de formulários (RD Station, e-mail, etc.)
- Demais páginas de curso além de Aleitamento Materno
- Tracking/analytics em produção
