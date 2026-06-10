# FlyerPro

Um "designer fixo" para empresas: gera flyers mantendo **identidade visual e linha editorial
consistentes**. A continuidade vem de um **Brand Kit** (logo, paleta, tom, referências) guardado no
Postgres — não de "torcer pra IA lembrar".

- **Geração de imagem:** [fal.ai](https://fal.ai) — modelo Grok Imagine Image (text-to-image e
  image-to-image). Chamado direto do nosso backend via `@fal-ai/client`; **nenhum fluxo manual no fal**.
- **Diretor de arte (prompt):** Deepseek transforma `Brand Kit + briefing` num prompt visual on-brand.
- **Stack:** Next.js 15 (App Router) · Postgres + Prisma · Auth.js · storage local (volume) ou S3 (MinIO/R2).

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
| `AUTH_URL` / `APP_URL` | URL pública do app |
| `FAL_KEY` | fal.ai |
| `DEEPSEEK_API_KEY` | Deepseek (prompt builder) |

Storage: padrão **local** (`STORAGE_DRIVER=local`) — arquivos num volume montado em `/app/.uploads`,
servidos por `/api/files/...`. Para usar S3/MinIO/R2, defina `STORAGE_DRIVER=s3` e as `S3_*`.

## Deploy no Easypanel

Passo a passo completo em [DEPLOY-EASYPANEL.md](DEPLOY-EASYPANEL.md). Resumo: crie um **Postgres** e um
**App** (build pelo `Dockerfile`) com um **volume em `/app/.uploads`**, preencha as 6 variáveis acima e
faça deploy. O container roda `prisma db push` no start.

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
    files/[...path]/      serve os arquivos do storage local
lib/
  db.ts fal.ts deepseek.ts storage.ts palette.ts generate.ts session.ts
prisma/schema.prisma
```

## Roadmap (pós-MVP)

- Galeria de modelos curada + seleção de estilo.
- Geração em lote / calendário de campanha.
- Modo híbrido de texto (template sobre o fundo da IA).
- Billing por workspace (já há `costUsd` em cada `Generation`).
