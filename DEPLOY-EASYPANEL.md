# Deploy no Easypanel — passo a passo

Você vai criar **3 serviços** dentro de um projeto no Easypanel:

1. **Postgres** (banco)
2. **MinIO** (storage das imagens)
3. **App** (este repositório)

> Não se assuste com a lista de variáveis do `.env.example`. **A maioria tem valor padrão e você
> ignora.** Abaixo está só o que você precisa preencher de verdade.

---

## 1) Criar o Postgres

1. No seu projeto do Easypanel → **+ Create Service → Postgres**.
2. Dê um nome (ex.: `db`), defina uma senha e crie.
3. Anote a **connection string interna**. Ela tem o formato:
   ```
   postgresql://postgres:SUA_SENHA@db:5432/postgres
   ```
   (`db` = o nome do serviço; serviços no mesmo projeto se enxergam pelo nome.)

→ isso vira a variável **`DATABASE_URL`** do App.

---

## 2) Criar o MinIO (storage)

1. **+ Create Service → MinIO** (ou App pela imagem `minio/minio`).
2. Defina usuário e senha root (ex.: `minioadmin` / uma senha forte). Anote.
3. Exponha um **domínio público** para a porta **9000** (ex.: `storage.seudominio.com`).
   As imagens dos flyers são carregadas no navegador por esse domínio.
4. Abra o **console do MinIO** (porta 9001) → crie o bucket **`flyerpro`** → em **Anonymous /
   Access Policy**, deixe como **public / download** (leitura pública), senão as imagens não aparecem.

Disso saem:
- **`S3_ENDPOINT`** = `http://NOME_DO_SERVICO_MINIO:9000` (interno, ex.: `http://minio:9000`)
- **`S3_PUBLIC_URL`** = `https://storage.seudominio.com/flyerpro` (público)
- **`S3_ACCESS_KEY_ID`** = usuário root do MinIO
- **`S3_SECRET_ACCESS_KEY`** = senha root do MinIO

> Alternativa mais simples: **Cloudflare R2** (cria bucket público sozinho). Aí `S3_ENDPOINT` é o
> endpoint do R2, `S3_PUBLIC_URL` é o domínio público do bucket, e as chaves são as do R2.

---

## 3) Criar o App (este repositório)

1. **+ Create Service → App**.
2. **Source → GitHub** → repositório `HaranBraga/flyerpro`, branch **`main`**.
3. **Build → Dockerfile** (o Easypanel detecta o `Dockerfile` automaticamente).
4. **Domains** → adicione o domínio do app (ex.: `app.seudominio.com`). Porta **3000**.
5. **Environment** → cole as variáveis da tabela abaixo.
6. **Deploy.** No start, o container roda `prisma db push` (cria as tabelas) e sobe o app.

---

## Variáveis do App — a lista que importa

Cole **apenas estas** (as demais do `.env.example` têm padrão e podem ficar de fora):

| Variável | O que pôr |
| --- | --- |
| `DATABASE_URL` | a connection string do Postgres (passo 1) |
| `AUTH_SECRET` | um segredo aleatório — veja abaixo como gerar |
| `AUTH_URL` | a URL pública do app, ex.: `https://app.seudominio.com` |
| `APP_URL` | a mesma URL pública do app |
| `FAL_KEY` | sua chave do fal.ai |
| `DEEPSEEK_API_KEY` | sua chave do Deepseek |
| `S3_ENDPOINT` | interno do MinIO, ex.: `http://minio:9000` |
| `S3_PUBLIC_URL` | público, ex.: `https://storage.seudominio.com/flyerpro` |
| `S3_ACCESS_KEY_ID` | usuário root do MinIO |
| `S3_SECRET_ACCESS_KEY` | senha root do MinIO |
| `S3_BUCKET` | `flyerpro` |
| `S3_FORCE_PATH_STYLE` | `true` |

**Gerar o `AUTH_SECRET`** (rode em qualquer terminal):
```
npx auth secret
```
ou, se preferir, qualquer string aleatória longa (32+ caracteres).

### Variáveis que você NÃO precisa preencher (têm padrão no código)
`FAL_MODEL_TEXT`, `FAL_MODEL_EDIT`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`, `S3_REGION`,
`AUTH_TRUST_HOST` (já tratado no código). Só mexa nelas se precisar trocar o modelo do fal.

---

## Conferir se subiu

1. Acesse `https://app.seudominio.com` → deve abrir a landing.
2. **Criar conta** → **Onboarding** (suba uma logo) → **Gerar flyer**.
3. Se a imagem não aparecer mas a geração concluir: revise o **bucket público** e o `S3_PUBLIC_URL`.
4. Se a geração falhar: confira `FAL_KEY` e `DEEPSEEK_API_KEY` nos logs do serviço App.
