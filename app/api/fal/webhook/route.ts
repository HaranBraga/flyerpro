import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { putObject } from "@/lib/storage";
import type { FalImageOutput } from "@/lib/fal";

// fal queue webhook. Used by the async generation path in production.
// Payload: { request_id, status, payload?, error? }
export async function POST(req: Request) {
  let body: {
    request_id?: string;
    status?: string;
    payload?: FalImageOutput;
    error?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const requestId = body.request_id;
  if (!requestId) return NextResponse.json({ ok: false }, { status: 400 });

  const generation = await db.generation.findFirst({
    where: { falRequestId: requestId },
    include: { brand: true },
  });
  if (!generation) return NextResponse.json({ ok: true }); // unknown id — ack

  if (body.status === "ERROR" || body.error) {
    await db.generation.update({
      where: { id: generation.id },
      data: { status: "ERROR", error: body.error ?? "fal webhook error" },
    });
    return NextResponse.json({ ok: true });
  }

  const image = body.payload?.images?.[0];
  if (!image?.url) {
    await db.generation.update({
      where: { id: generation.id },
      data: { status: "ERROR", error: "Webhook sem imagem." },
    });
    return NextResponse.json({ ok: true });
  }

  const res = await fetch(image.url);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = image.content_type ?? "image/png";
  const stored = await putObject(buf, mime, `brands/${generation.brand.id}/results`);

  const resultAsset = await db.asset.create({
    data: {
      brandId: generation.brand.id,
      type: "RESULT",
      url: stored.url,
      mimeType: mime,
      width: image.width,
      height: image.height,
    },
  });

  await db.generation.update({
    where: { id: generation.id },
    data: { status: "DONE", resultAssetId: resultAsset.id, costUsd: 0.022 },
  });

  return NextResponse.json({ ok: true });
}
