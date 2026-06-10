# Deploy no Easypanel — passo a passo

Você vai criar **2 serviços** dentro de um projeto no Easypanel:

1. **Postgres** (banco)
2. **App** (este repositório) — com um **volume** para as imagens

> Storage: por padrão o app guarda as imagens **num volume dele mesmo** (`STORAGE_DRIVER=local`).
> Sem MinIO, sem chaves, sem bucket público. As imagens são servidas pela própria URL do app.

---

## 1) Criar o Postgres

1. No seu projeto do Easypanel → **+ Create Service → Postgres**.
2. Dê um nome (ex.: `db`), defina uma senha e crie.
3. Anote a **connection string interna**:
   ```
   postgresql://postgres:SUA_SENHA@db:5432/postgres
   ```
   (`db` = o nome do serviço.)

→ isso vira a variável **`DATABASE_URL`** do App.

---

## 2) Criar o App (este repositório)

1. **+ Create Service → App**.
2. **Source → GitHub** → repositório `HaranBraga/flyerpro`, branch **`main`**.
3. **Build → Dockerfile** (detectado automaticamente).
4. **Domains** → adicione o domínio do app (ex.: `app.seudominio.com`). Porta **3000**.
5. **Volumes** → adicione **1 volume** montado em:
   ```
   /app/.uploads
   ```
   É aqui que ficam logos, artes e flyers gerados. **Sem esse volume, as imagens somem a cada deploy.**
6. **Environment** → cole as variáveis abaixo.
7. **Deploy.** No start, o container roda `prisma db push` (cria as tabelas) e sobe o app.

---

## Variáveis do App — a lista completa

Cole **apenas estas**:

| Variável | O que pôr |
| --- | --- |
| `DATABASE_URL` | a connection string do Postgres (passo 1) |
| `AUTH_SECRET` | um segredo aleatório — `npx auth secret` (ou 32+ chars aleatórios) |
| `AUTH_URL` | a URL pública do app, ex.: `https://app.seudominio.com` |
| `APP_URL` | a mesma URL pública do app |
| `FAL_KEY` | sua chave do fal.ai |
| `DEEPSEEK_API_KEY` | sua chave do Deepseek |

Só isso. `STORAGE_DRIVER=local` e `UPLOADS_DIR=.uploads` já são o padrão do código — não precisa setar.

### Não precisa preencher (têm padrão no código)
`STORAGE_DRIVER`, `UPLOADS_DIR`, `FAL_MODEL_TEXT`, `FAL_MODEL_EDIT`, `DEEPSEEK_BASE_URL`,
`DEEPSEEK_MODEL`, `AUTH_TRUST_HOST` (já tratado no código).

---

## Conferir se subiu

1. Acesse `https://app.seudominio.com` → deve abrir a landing.
2. **Criar conta** → **Onboarding** (suba uma logo) → **Gerar flyer**.
3. Se a geração falhar: confira `FAL_KEY` e `DEEPSEEK_API_KEY` nos logs do serviço App.
4. Se a imagem subir mas sumir após um redeploy: confirme que o **volume** está montado em `/app/.uploads`.

---

## (Opcional) Usar MinIO/R2 em vez do volume

Se um dia quiser storage S3-compatível, defina `STORAGE_DRIVER=s3` e as variáveis `S3_*`
(veja o `.env.example`). O código alterna sozinho entre os dois drivers.
