import { db } from "./db";
import { buildFlyerPrompt } from "./deepseek";
import { generateSync, uploadToFal } from "./fal";
import { putObject } from "./storage";
import { searchSegmentReferences } from "./references";

const MAX_IMAGES = 3; // Grok edit aceita no máximo 3 imagens de entrada.
const MAX_STYLE_REFS = 2; // logo + 2 referências = 3.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/** Sobe um asset já armazenado para o fal e cacheia a fal URL. */
async function ensureFalUrl(assetId: string): Promise<string | undefined> {
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return undefined;
  if (asset.falUrl) return asset.falUrl;

  try {
    const res = await fetch(asset.url);
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    const mime =
      res.headers.get("content-type") ?? asset.mimeType ?? "image/jpeg";
    const falUrl = await uploadToFal(buf, mime);
    await db.asset.update({ where: { id: assetId }, data: { falUrl } });
    return falUrl;
  } catch {
    return undefined;
  }
}

/** Baixa uma imagem externa (referência raspada) e sobe pro fal. */
async function falUrlFromExternal(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: new URL(url).origin },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return undefined;
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    if (!mime.startsWith("image/")) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 10 * 1024 * 1024) return undefined;
    return await uploadToFal(buf, mime);
  } catch {
    return undefined;
  }
}

/**
 * Monta a lista de imagens de referência para a geração:
 *   índice 0 = LOGO da marca (se houver)
 *   depois  = até 2 referências de estilo, nesta ordem de preferência:
 *     1) referências escolhidas manualmente
 *     2) busca por segmento (Freepik/Behance, best-effort)
 *     3) artes que a empresa já subiu
 */
async function gatherReferenceImages(
  brand: { id: string; logoAssetId: string | null; industry: string | null },
  selectedAssetIds: string[]
): Promise<{ imageUrls: string[]; hasLogo: boolean; styleRefCount: number }> {
  // Logo primeiro.
  let logoUrl: string | undefined;
  if (brand.logoAssetId) logoUrl = await ensureFalUrl(brand.logoAssetId);

  const styleUrls: string[] = [];
  const push = (u?: string) => {
    if (u && styleUrls.length < MAX_STYLE_REFS && !styleUrls.includes(u))
      styleUrls.push(u);
  };

  // 1) seleção manual
  for (const id of selectedAssetIds) {
    if (styleUrls.length >= MAX_STYLE_REFS) break;
    push(await ensureFalUrl(id));
  }

  // 2) busca por segmento
  if (styleUrls.length < MAX_STYLE_REFS && brand.industry) {
    const scraped = await searchSegmentReferences(
      brand.industry,
      MAX_STYLE_REFS - styleUrls.length
    );
    for (const src of scraped) {
      if (styleUrls.length >= MAX_STYLE_REFS) break;
      push(await falUrlFromExternal(src));
    }
  }

  // 3) artes da própria empresa
  if (styleUrls.length < MAX_STYLE_REFS) {
    const arts = await db.asset.findMany({
      where: { brandId: brand.id, type: { in: ["PAST_ART", "REFERENCE"] } },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
    for (const a of arts) {
      if (styleUrls.length >= MAX_STYLE_REFS) break;
      push(await ensureFalUrl(a.id));
    }
  }

  const imageUrls = (logoUrl ? [logoUrl, ...styleUrls] : styleUrls).slice(
    0,
    MAX_IMAGES
  );
  return {
    imageUrls,
    hasLogo: Boolean(logoUrl),
    styleRefCount: styleUrls.length,
  };
}

/**
 * Roda uma geração completa de forma síncrona: monta referências + prompt →
 * chama o fal (logo + referências via image_urls) → salva o resultado.
 */
export async function runGeneration(generationId: string): Promise<void> {
  const generation = await db.generation.findUnique({
    where: { id: generationId },
    include: { brand: true },
  });
  if (!generation) throw new Error("Generation não encontrada.");

  await db.generation.update({
    where: { id: generationId },
    data: { status: "RUNNING" },
  });

  try {
    const brand = generation.brand;
    const selectedIds =
      (generation.referenceAssetIds as string[] | null) ?? [];

    const { imageUrls, hasLogo, styleRefCount } = await gatherReferenceImages(
      brand,
      selectedIds
    );

    const prompt = await buildFlyerPrompt(
      {
        name: brand.name,
        industry: brand.industry,
        tone: brand.tone,
        styleDescription: brand.styleDescription,
        palette: (brand.palette as string[] | null) ?? null,
      },
      generation.brief,
      { hasLogo, styleRefCount }
    );

    const seed = (generation.params as { seed?: number } | null)?.seed;
    const { output, model } = await generateSync({ prompt, imageUrls, seed });

    const image = output.images?.[0];
    if (!image?.url) throw new Error("fal não retornou imagem.");

    // Persist the result in our own storage.
    const res = await fetch(image.url);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = image.content_type ?? "image/png";
    const stored = await putObject(buf, mime, `brands/${brand.id}/results`);

    const resultAsset = await db.asset.create({
      data: {
        brandId: brand.id,
        type: "RESULT",
        url: stored.url,
        mimeType: mime,
        width: image.width,
        height: image.height,
      },
    });

    const costUsd = 0.02 + 0.002 * imageUrls.length; // saída + entradas

    await db.generation.update({
      where: { id: generationId },
      data: {
        status: "DONE",
        prompt,
        model,
        resultAssetId: resultAsset.id,
        costUsd,
        params: {
          ...(generation.params as object),
          seed: output.seed ?? seed,
          imageCount: imageUrls.length,
        },
      },
    });
  } catch (err) {
    await db.generation.update({
      where: { id: generationId },
      data: {
        status: "ERROR",
        error: err instanceof Error ? err.message : "Erro desconhecido.",
      },
    });
    throw err;
  }
}
