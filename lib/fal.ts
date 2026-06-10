import { fal } from "@fal-ai/client";
import { env } from "./env";

// Configure the fal client once with our server-side key.
if (env.fal.key) {
  fal.config({ credentials: env.fal.key });
}

export type FalImage = {
  url: string;
  width?: number;
  height?: number;
  content_type?: string;
};

export type FalImageOutput = {
  images: FalImage[];
  seed?: number;
};

export type GenerateInput = {
  prompt: string;
  /**
   * Reference images for the edit model. Both Grok edit and Nano Banana edit
   * accept `image_urls` as an array (Grok: máx. 3). Convenção: o índice 0 é a
   * LOGO da marca; os demais são referências de estilo.
   */
  imageUrls?: string[];
  seed?: number;
  /** Extra model-specific params (aspect ratio, etc.). */
  extra?: Record<string, unknown>;
};

/** Pick the right model slug: edit (i2i) when references are provided. */
export function pickModel(hasReference: boolean): string {
  return hasReference ? env.fal.modelEdit : env.fal.modelText;
}

/** Upload a buffer to fal.storage and return the hosted URL. */
export async function uploadToFal(
  body: Buffer | Uint8Array,
  mimeType: string
): Promise<string> {
  const bytes = new Uint8Array(body);
  const blob = new Blob([bytes], { type: mimeType });
  return fal.storage.upload(blob);
}

function hasReferences(input: GenerateInput): boolean {
  return Array.isArray(input.imageUrls) && input.imageUrls.length > 0;
}

function buildInput(input: GenerateInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    prompt: input.prompt,
    ...input.extra,
  };
  if (hasReferences(input)) payload.image_urls = input.imageUrls;
  if (typeof input.seed === "number") payload.seed = input.seed;
  return payload;
}

/**
 * Submit to the fal async queue. Returns the request id so a webhook can
 * later finish the Generation record. Preferred for production.
 */
export async function submitGeneration(
  input: GenerateInput,
  webhookUrl?: string
): Promise<{ requestId: string; model: string }> {
  const model = pickModel(hasReferences(input));
  const { request_id } = await fal.queue.submit(model, {
    input: buildInput(input),
    webhookUrl,
  });
  return { requestId: request_id, model };
}

/** Fetch the result of a queued request (called from the webhook/poller). */
export async function getGenerationResult(
  model: string,
  requestId: string
): Promise<FalImageOutput> {
  const result = await fal.queue.result(model, { requestId });
  return result.data as FalImageOutput;
}

/**
 * Run synchronously (subscribe + poll). Simpler for local dev / MVP when no
 * public webhook URL is available. Resolves once the image is ready.
 */
export async function generateSync(
  input: GenerateInput
): Promise<{ output: FalImageOutput; model: string }> {
  const model = pickModel(hasReferences(input));
  const result = await fal.subscribe(model, {
    input: buildInput(input),
    logs: false,
  });
  return { output: result.data as FalImageOutput, model };
}
