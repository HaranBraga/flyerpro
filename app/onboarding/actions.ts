"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { putObject, storeFromUrl } from "@/lib/storage";
import { extractPalette } from "@/lib/palette";
import { inferBrandStyle } from "@/lib/deepseek";
import { env } from "@/lib/env";

const schema = z.object({
  name: z.string().min(2, "Informe o nome da marca."),
  industry: z.string().optional().default(""),
  description: z.string().optional().default(""),
});

export type OnboardingState = { error?: string } | undefined;

async function fileToBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

function isImage(file: File): boolean {
  return file.size > 0 && file.type.startsWith("image/");
}

export async function createBrandAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();

  const parsed = schema.safeParse({
    name: formData.get("name"),
    industry: formData.get("industry"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { name, industry, description } = parsed.data;

  // 1. Workspace + membership (multi-tenant root).
  const workspace = await db.workspace.create({
    data: {
      name,
      slug: slugify(name),
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  // 2. Brand (logo/palette filled in below).
  const brand = await db.brand.create({
    data: { workspaceId: workspace.id, name, industry: industry || null },
  });

  // 3. Logo → upload + palette extraction.
  let palette: string[] = [];
  const logo = formData.get("logo");
  if (logo instanceof File && isImage(logo)) {
    const buf = await fileToBuffer(logo);
    const stored = await putObject(buf, logo.type, `brands/${brand.id}/logo`);
    palette = await extractPalette(buf);
    const logoAsset = await db.asset.create({
      data: {
        brandId: brand.id,
        type: "LOGO",
        url: stored.url,
        mimeType: logo.type,
      },
    });
    await db.brand.update({
      where: { id: brand.id },
      data: { logoAssetId: logoAsset.id, palette },
    });
  }

  // 4. Past arts (multiple) → references for the editorial line.
  const arts = formData.getAll("arts").filter((a): a is File => a instanceof File);
  for (const art of arts) {
    if (!isImage(art)) continue;
    const buf = await fileToBuffer(art);
    const stored = await putObject(buf, art.type, `brands/${brand.id}/arts`);
    await db.asset.create({
      data: {
        brandId: brand.id,
        type: "PAST_ART",
        url: stored.url,
        mimeType: art.type,
      },
    });
  }

  // 5. Inspiration links (Behance/Freepik) → stored as private references.
  const links = String(formData.get("references") ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
  for (const link of links) {
    try {
      const stored = await storeFromUrl(link, `brands/${brand.id}/refs`);
      await db.asset.create({
        data: {
          brandId: brand.id,
          type: "REFERENCE",
          url: stored.url,
          sourceUrl: link,
          mimeType: stored.mimeType,
        },
      });
    } catch {
      // Skip broken/blocked links — onboarding shouldn't fail on one bad URL.
    }
  }

  // 6. Infer tone/style via Deepseek (best-effort; needs DEEPSEEK_API_KEY).
  if (env.deepseek.apiKey && description) {
    try {
      const { tone, styleDescription } = await inferBrandStyle(
        name,
        industry,
        description
      );
      await db.brand.update({
        where: { id: brand.id },
        data: { tone, styleDescription },
      });
    } catch {
      // Non-fatal.
    }
  }

  redirect("/dashboard");
}
