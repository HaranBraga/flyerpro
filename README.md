# FlyerPro

Um "designer fixo" para empresas: gera flyers mantendo **identidade visual e linha editorial
consistentes**. A continuidade vem de um **Brand Kit** (logo, paleta, tom, referências) guardado no
Postgres — não de "torcer pra IA lembrar".

- **Geração de imagem:** [fal.ai](https://fal.ai) — modelo Grok Imagine Image (text-to-image e
  image-to-image). Chamado direto do nosso backend via `@fal-ai/client`; **nenhum fluxo manual no fal**.
- **Diretor de arte (prompt):** Deepseek transforma `Brand Kit + briefing` num prompt visual on-brand.
- **Stack:** Next.js 15 (App Router) · Postgres + Prisma · Auth.js · storage S3 (MinIO/R2).

## Como o sistema funciona (MVP)

1. **Onboarding:** o usuário cria a conta, sobe **logo** + **artes atuais** + links de inspiração e
   descreve a marca. Extraímos a **paleta** da logo e o Deepseek infere **tom/estilo**.
2. **Studio:** o usuário escreve o **briefing** do flyer (oferta, texto, data) e, opcionalmente,
   escolhe **1 referência** (modo image-to-image).
3. **Geração:** Deepseek monta o prompt → fal.ai gera a imagem → salvamos no storage → mostramos o
   resultado com opções de **baixar** e **gerar variação**.

> Nota: o texto do flyer é renderizado **100% pela IA** (decisão de produto). Modelos de imagem podem
> errar/borrar texto — por isso há "gerar variação". Upgrade futuro (v2): modo híbrido com texto
> sobreposto por template (Satori/sharp). A arquitetura já está pronta para isso.

## Rodar localmente

### Opção A — tudo no Docker
```bash
cp .env.example .env   # preencha FAL_KEY e DEEPSEEK_API_KEY
docker compose up --build
```
App em http://localhost:3000 · MinIO console em http://localhost:9001 (minioadmin/minioadmin).

### Opção B — app local, infra no Docker
```bash
cp .env.example .env            # ajuste as chaves
docker compose up db minio minio-setup   # sobe só Postgres + MinIO
npm install
npm run db:push                 # cria as tabelas
npm run dev
```

## Variáveis de ambiente

Veja [.env.example](.env.example). Essenciais:

| Var | Para quê |
| --- | --- |
| `DATABASE_URL` | Postgres |
| `AUTH_SECRET` | Auth.js (gere com `npx auth secret`) |
| `FAL_KEY` | fal.ai |
| `DEEPSEEK_API_KEY` | Deepseek (prompt builder) |
| `S3_*` | Storage de assets (MinIO ou Cloudflare R2) |

Os slugs dos modelos fal são configuráveis: `FAL_MODEL_TEXT` (text-to-image) e `FAL_MODEL_EDIT`
(image-to-image).

## Deploy no Easypanel

1. **Postgres:** crie um serviço Postgres no Easypanel → copie a connection string para `DATABASE_URL`.
2. **Storage:** crie um serviço **MinIO** (ou use **Cloudflare R2**) e crie o bucket `flyerpro`.
   Aponte `S3_ENDPOINT`, chaves e `S3_PUBLIC_URL`.
3. **App:** crie um serviço a partir deste repositório (build pelo `Dockerfile`). Preencha todas as
   envs. O container roda `prisma db push` no start e sobe o servidor standalone na porta `3000`.
4. Defina `AUTH_URL`/`APP_URL` com o domínio público do app.

## Estrutura

```
app/
  (auth)/            login, signup, server actions de auth
  onboarding/        criar workspace + brand + uploads
  studio/            gerar flyer (briefing + referência)
  generations/[id]/  resultado + variação
  dashboard/         marca, paleta, flyers gerados
  api/
    auth/[...nextauth]/   Auth.js
    fal/webhook/          callback da fila do fal (modo assíncrono)
lib/
  db.ts fal.ts deepseek.ts storage.ts palette.ts generate.ts session.ts
prisma/schema.prisma
```

## Roadmap (pós-MVP)

- Galeria de modelos curada + seleção de estilo.
- Geração em lote / calendário de campanha.
- Modo híbrido de texto (template sobre o fundo da IA).
- Billing por workspace (já há `costUsd` em cada `Generation`).
