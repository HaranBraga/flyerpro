import { db } from "./db";
import { buildFlyerPrompt } from "./deepseek";
import { generateSync, uploadToFal } from "./fal";
import { putObject } from "./storage";

const COST_PER_IMAGE_USD = 0.022; // Grok Imagine edit/text — approx.

/** Make a reference asset reachable by fal (re-upload + cache the fal URL). */
async function ensureFalUrl(assetId: string): Promise<string | undefined> {
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset) return undefined;
  if (asset.falUrl) return asset.falUrl;

  const res = await fetch(asset.url);
  if (!res.ok) return undefined;
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") ?? asset.mimeType ?? "image/jpeg";
  const falUrl = await uploadToFal(buf, mime);

  await db.asset.update({ where: { id: assetId }, data: { falUrl } });
  return falUrl;
}

/**
 * Run a full generation synchronously: build prompt → call fal → store result.
 * Used by the studio (MVP). Updates the Generation row in place.
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
    const prompt = await buildFlyerPrompt(
      {
        name: brand.name,
        industry: brand.industry,
        tone: brand.tone,
        styleDescription: brand.styleDescription,
        palette: (brand.palette as string[] | null) ?? null,
      },
      generation.brief
    );

    // Optional reference image (image-to-image).
    const refIds = (generation.referenceAssetIds as string[] | null) ?? [];
    let imageUrl: string | undefined;
    if (refIds.length > 0) {
      imageUrl = await ensureFalUrl(refIds[0]);
    }

    const seed = (generation.params as { seed?: number } | null)?.seed;
    const { output, model } = await generateSync({ prompt, imageUrl, seed });

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

    await db.generation.update({
      where: { id: generationId },
      data: {
        status: "DONE",
        prompt,
        model,
        resultAssetId: resultAsset.id,
        costUsd: COST_PER_IMAGE_USD,
        params: { ...(generation.params as object), seed: output.seed ?? seed },
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
