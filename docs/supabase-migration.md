# Migração Vercel Blob → Supabase

Projeto Supabase: **ead-faculdade-ide** (`sjokgfvaszczuisavuwb`, região `sa-east-1`)

## Schema aplicado

| Recurso | Descrição |
|---------|-----------|
| `cms_collections` | 8 coleções CMS em JSONB (courses, professors, …) |
| `cms_account` | Conta admin (username, password_hash, email) |
| `guide_leads` | Leads do formulário de guia |
| `app_meta` | Metadados da migração |
| Storage `cms-media` | Bucket público para imagens/PDFs do CMS |

RLS ativado sem políticas públicas — apenas **service_role** (backend) acessa Postgres.

## Variáveis na Vercel

Adicione em **Project Settings → Environment Variables**:

| Variável | Valor |
|----------|-------|
| `STORAGE_PROVIDER` | `supabase` |
| `SUPABASE_URL` | `https://sjokgfvaszczuisavuwb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role (secret) |
| `SUPABASE_MEDIA_BUCKET` | `cms-media` |

Opcional: `SUPABASE_ANON_KEY` (não usado pelo backend hoje).

Remova ou deixe de usar após validação:

- `BLOB_STORE_ID`, `BLOB_MEDIA_STORE_ID`, tokens Blob

## Passos locais

1. Copie `.env.example` → `.env.local` e preencha `SUPABASE_SERVICE_ROLE_KEY`.

2. Instale dependências:

   ```bash
   npm install
   ```

3. Seed do repositório (dados em `data/cms/`):

   ```bash
   npm run sync:supabase
   ```

4. Migrar produção Blob → Supabase (requer tokens Blob):

   ```bash
   npm run migrate:blob-to-supabase
   ```

5. Teste local com Supabase:

   ```bash
   npm run dev
   ```

6. Deploy na Vercel com as novas env vars.

## Prioridade de storage

`lib/storage-provider.js` escolhe automaticamente:

1. **Supabase** — se `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
2. **Vercel Blob** — fallback legado
3. **Filesystem** — dev local (`data/cms/`)

Force com `STORAGE_PROVIDER=supabase|blob|local`.

## Arquivos alterados

- `lib/supabase/` — client, CMS e media storage
- `lib/storage-provider.js` — seleção de backend
- `lib/cms.js`, `account.js`, `guide-leads.js`, `image-storage.js`, `media-files.js`
- `supabase/migrations/202606250001_cms_schema.sql`
