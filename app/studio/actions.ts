"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/session";
import { runGeneration } from "@/lib/generate";

const schema = z.object({
  brandId: z.string().min(1),
  brief: z.string().min(5, "Descreva melhor o flyer (mín. 5 caracteres)."),
  referenceAssetId: z.string().optional(),
});

export type StudioState = { error?: string } | undefined;

/** Verify the brand belongs to the logged-in user's workspace. */
async function assertBrandAccess(brandId: string) {
  const { workspace } = await requireWorkspace();
  const brand = await db.brand.findFirst({
    where: { id: brandId, workspaceId: workspace.id },
  });
  if (!brand) throw new Error("Marca não encontrada.");
  return brand;
}

export async function createGenerationAction(
  _prev: StudioState,
  formData: FormData
): Promise<StudioState> {
  const parsed = schema.safeParse({
    brandId: formData.get("brandId"),
    brief: formData.get("brief"),
    referenceAssetId: formData.get("referenceAssetId") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { brandId, brief, referenceAssetId } = parsed.data;
  await assertBrandAccess(brandId);

  const generation = await db.generation.create({
    data: {
      brandId,
      brief,
      model: "",
      referenceAssetIds: referenceAssetId ? [referenceAssetId] : [],
    },
  });

  try {
    await runGeneration(generation.id);
  } catch {
    // Error is recorded on the row; the result page shows it.
  }

  redirect(`/generations/${generation.id}`);
}

/** Re-run an existing generation with a fresh random seed (variations). */
export async function regenerateAction(formData: FormData): Promise<void> {
  const sourceId = String(formData.get("generationId") ?? "");
  const source = await db.generation.findUnique({ where: { id: sourceId } });
  if (!source) throw new Error("Generation não encontrada.");
  await assertBrandAccess(source.brandId);

  const generation = await db.generation.create({
    data: {
      brandId: source.brandId,
      brief: source.brief,
      model: "",
      referenceAssetIds: source.referenceAssetIds ?? [],
      params: { seed: Math.floor(Math.random() * 1_000_000) },
    },
  });

  try {
    await runGeneration(generation.id);
  } catch {
    // recorded on the row
  }

  redirect(`/generations/${generation.id}`);
}
