# Infraestrutura na Cloudflare

Guia para operar o site na Cloudflare e concluir a troca de infraestrutura. Estado em 5 de novembro de 2026.

## Situação atual

O mesmo código roda em dois lugares:

| | Produção atual | Nova infraestrutura (pronta) |
|---|---|---|
| Site e API | Vercel (`ead-faculdade-ide.vercel.app`) | Worker `ead-faculdade-ide` |
| Banco de dados | Supabase (Postgres) | D1 `ead-faculdade-ide` |
| Imagens, PDFs e vídeos | Supabase Storage (`cms-media`) | R2 `ead-faculdade-ide-media` |
| Endereço | domínio ainda não aponta para nenhum dos dois | https://ead-faculdade-ide.nathalia-25e.workers.dev |

O banco D1 e o bucket R2 são **cópias** do Supabase feitas em 5/11/2026. Edições no admin da Vercel não chegam à Cloudflare sozinhas. Até a virada, edite somente no admin da Vercel; na virada, a importação traz tudo de novo (ver [Virada](#virada-para-a-cloudflare)).

Testado no Worker em 5/11/2026: as 10 páginas de curso e as páginas estáticas idênticas às da Vercel, os 164 arquivos servidos pelo R2 com o mesmo SHA-256, redirects, cabeçalhos de segurança e bloqueio de arquivos internos. Login e envio de arquivos no admin do Worker foram testados só em ambiente local.

## Como o código se organiza

- `api/handler.js` e `lib/` são compartilhados. A variável `STORAGE_PROVIDER` escolhe o backend: `supabase` na Vercel, `cloudflare` no Worker.
- `lib/cms-database.js` decide entre Supabase e D1. O código do D1 fica em `lib/cloudflare/d1-storage.js`; o do R2, em `lib/cloudflare/r2-media.js`.
- `cloudflare/` é o projeto do Worker, com `package.json` próprio. Fica numa subpasta porque o Vite trataria o `index.html` da raiz como entrada de app e alteraria os assets.
  - `cloudflare.config.ts`: Worker, bindings (`DB`, `MEDIA`, `ASSETS`), cache e observabilidade.
  - `worker/index.js`: rotas, redirects e cabeçalhos; adapta o `api/handler.js` (estilo Node) ao Worker em `worker/node-adapter.js`.
  - `worker/media.js`: entrega de mídia do R2 (ETag, 304, Range) e recebimento de upload de vídeo.
  - `migrations/`: schema do D1.
  - `scripts/build-assets.mjs`: copia para `cloudflare/build/public` só os arquivos públicos e gera o `_headers`.
  - `scripts/import-from-backup.mjs`: importa um backup do Supabase para o D1 e o R2.
  - `scripts/smoke-test.mjs`: compara o Worker com outro site, só leitura.
- `scripts/backup-supabase.mjs` (raiz): backup completo do Supabase em `backups/`.

Upload de vídeo no Worker: o admin pede uma URL assinada e envia o arquivo por `PUT /api/media/direct-upload`. O token é assinado com o `CMS_SECRET`, vale 30 minutos e aceita até 100 MB.

## Recursos na conta Cloudflare

Conta `25e749043ce433036240369c6fd2b981` (Nathalia@faculdadeide.edu.br's Account).

| Recurso | Nome | Detalhe |
|---|---|---|
| Worker | `ead-faculdade-ide` | URL de teste `*.nathalia-25e.workers.dev`, com `noindex` |
| D1 | `ead-faculdade-ide` | id `3d550df8-e81a-4d82-b1af-ec2958a625ba`, região ENAM (EUA) |
| R2 | `ead-faculdade-ide-media` | região ENAM (EUA) |
| Secret | `CMS_SECRET` | assina sessões do admin e tokens de upload; existe só na Cloudflare |

A conta é da faculdade e também tem `dash-ide`, `ide-docente`, `ide-portal` e o D1 `dash-ide`, que são de outros sistemas. Não altere esses recursos nem reutilize os nomes.

## Preparar uma máquina nova

Requisitos: Node.js 22.18 ou mais novo e Git.

```bash
git clone https://github.com/nousdynamics/ead-faculdade-ide.git
cd ead-faculdade-ide
npm install
cd cloudflare && npm install
```

O `.env` não fica no Git. Crie-o na raiz com estas variáveis (peça os valores a quem administra o projeto):

| Variável | Uso |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_MEDIA_BUCKET` | backup do Supabase e produção na Vercel |
| `STORAGE_PROVIDER` | `supabase` para rodar local com o Supabase |
| `CMS_SECRET` | sessões do admin local |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | deploy e importação na Cloudflare |

A CLI `cf` não lê o `.env` sozinha. Antes de usar comandos da Cloudflare, exporte as duas variáveis no terminal.

Bash:

```bash
set -a; eval "$(grep -E '^CLOUDFLARE_(API_TOKEN|ACCOUNT_ID)=' .env | tr -d '\r')"; set +a
```

PowerShell:

```powershell
Get-Content .env | Where-Object { $_ -match '^(CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)=(.*)$' } | ForEach-Object { Set-Item "env:$($Matches[1])" $Matches[2].Trim() }
```

O token é de conta. Para validá-lo, use `/accounts/{id}/tokens/verify`; o endpoint `/user/tokens/verify` diz que ele é inválido.

## Comandos do dia a dia

Rode dentro de `cloudflare/`, com as credenciais exportadas.

| Tarefa | Comando |
|---|---|
| Publicar o Worker | `npm run deploy` |
| Aplicar migrations do D1 | `npm run db:migrate` |
| Importar o último backup (só D1) | `node scripts/import-from-backup.mjs` |
| Importar D1 e mídia | `node scripts/import-from-backup.mjs --media` |
| Importar um backup específico | `node scripts/import-from-backup.mjs --media --backup ../backups/supabase-AAAA-MM-DD` |
| Conferir o Worker | `node scripts/smoke-test.mjs https://ead-faculdade-ide.nathalia-25e.workers.dev https://ead-faculdade-ide.vercel.app --media` |
| Logs ao vivo | `npx wrangler tail ead-faculdade-ide` |
| Trocar o `CMS_SECRET` | `npx wrangler secret put CMS_SECRET --name ead-faculdade-ide` (derruba as sessões abertas) |

Backup do Supabase, na raiz: `npm run backup:supabase`. Gera `backups/supabase-AAAA-MM-DD/` com tabelas, arquivos e um `manifest.json` com o SHA-256 de cada arquivo. Rodar duas vezes no mesmo dia sobrescreve a pasta do dia.

A importação usa `INSERT OR REPLACE` nas coleções e usuários: **o que estiver no D1 é substituído pelo backup**. Edições feitas no admin do Worker antes da virada se perdem na reimportação.

O `smoke-test.mjs --media` segue redirects. Para provar que um arquivo saiu do R2 e não do Supabase, peça com `redirect: "manual"` e confira status 200.

### Teste local

`cf dev` não funciona nesta pasta por causa do espaço em `03. Clientes`. Alternativa:

```bash
cd cloudflare
npm run assets
npx cf build --mode localtest
npx vite preview --port 8791
```

Crie `cloudflare/.dev.vars` com `CMS_SECRET=<valor qualquer>`. O D1 local desse modo começa vazio; para preenchê-lo, use o Local Explorer em `http://localhost:8791/cdn-cgi/local/explorer/api`. No preview, corpos de requisição acima de 1 MB recusados pelo Worker aparecem como erro 500 do proxy local; no Worker publicado a resposta é a correta.

## Virada para a Cloudflare

Faça na ordem, num horário sem edições no admin.

1. **Congelar edições.** Avise quem usa o admin da Vercel para não editar até o fim da virada.
2. **Backup novo** (raiz): `npm run backup:supabase`. Confira que o total de arquivos fecha (`arquivos: N de N`).
3. **Importar** (em `cloudflare/`): `node scripts/import-from-backup.mjs --media`.
4. **Conferir:** rode o smoke test com `--media`. Precisa terminar em `tudo ok`.
5. **Domínio.** Configuração manual, descrita abaixo.
6. **Conferir no domínio:**
   - `node scripts/smoke-test.mjs https://ead.faculdadeide.edu.br https://ead-faculdade-ide.vercel.app --media`;
   - entrar no admin em `https://ead.faculdadeide.edu.br/admin`, editar um campo e enviar uma imagem;
   - confirmar que a resposta **não** tem `X-Robots-Tag: noindex` nas páginas públicas (o `noindex` vale só para `*.workers.dev` e `/admin`).
7. **Depois da virada:** o admin passa a ser o do domínio. O admin da Vercel deixa de ser usado; o que for editado lá não aparece no site.

### Domínio

O Worker precisa de um Custom Domain `ead.faculdadeide.edu.br`. A zona `faculdadeide.edu.br` usa nameservers da Cloudflare, mas o token do projeto não a enxerga: provavelmente ela está em outra conta Cloudflare.

- **Se a zona estiver nesta mesma conta:** apague o registro DNS atual de `ead` (hoje aponta para `203.159.80.163`, servidor antigo) e, em Workers & Pages → `ead-faculdade-ide` → Settings → Domains & Routes → Add → Custom domain, informe `ead.faculdadeide.edu.br`. A Cloudflare cria o DNS e o certificado.
- **Se a zona estiver em outra conta:** Custom Domain só funciona com a zona na mesma conta do Worker. Mova a zona para esta conta ou peça acesso à conta dona da zona e publique o Worker lá.

Para voltar atrás, aponte o DNS de `ead` para a Vercel. Atenção: o que for editado no admin do Worker depois da virada não existe no Supabase.

## LGPD

Decisão de 5/11/2026: seguir a LGPD brasileira, com dados armazenados nos EUA (D1 e R2 em ENAM; a Cloudflare não oferece região na América do Sul para eles). A política de privacidade (`politica-de-privacidade/index.html`) foi atualizada nessa data: cita a Cloudflare como provedora, tem a seção "Transferência internacional de dados" (art. 33) e mantém Vercel e Supabase enquanto a migração não terminar. Depois da virada e do desligamento do Supabase, retire as menções a Vercel e Supabase das seções 5 e 6.

Dados pessoais no D1: `guide_leads` (nome, e-mail, telefone; vazio em 5/11/2026) e `cms_users` (e-mail e hash de senha do admin).

## Cuidados

- `backups/`, `cloudflare/.wrangler/` e `cloudflare/.dev.vars` têm hashes de senha ou segredos. Estão no `.gitignore`; nunca commite nem compartilhe.
- O deploy do `cf` não lista secrets entre os bindings. Para conferir o `CMS_SECRET`, consulte `GET /accounts/{id}/workers/scripts/ead-faculdade-ide/secrets`.
- `.vercelignore` exclui `/cloudflare/` e `/backups/`, sempre com a barra inicial. Sem ela, `cloudflare/` excluiria também `lib/cloudflare/`, e a API da Vercel inteira quebra (`FUNCTION_INVOCATION_FAILED`). Aconteceu em 5/11/2026.
- Todo push em `main` ou `clone-fiel` gera deploy de **produção** na Vercel. Depois de um push, confira `https://ead-faculdade-ide.vercel.app/api/catalog`.
- Os cursos ficam no banco, não em arquivos: as pastas em `pos-graduacao/` são cópias antigas e não são publicadas.
