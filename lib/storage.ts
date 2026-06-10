import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { env } from "./env";

// S3-compatible client (works with MinIO and Cloudflare R2).
const s3 = new S3Client({
  region: env.s3.region,
  endpoint: env.s3.endpoint || undefined,
  forcePathStyle: env.s3.forcePathStyle,
  credentials:
    env.s3.accessKeyId && env.s3.secretAccessKey
      ? {
          accessKeyId: env.s3.accessKeyId,
          secretAccessKey: env.s3.secretAccessKey,
        }
      : undefined,
});

export type StoredObject = {
  key: string;
  url: string;
  mimeType: string;
  size: number;
};

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return map[mime] ?? "bin";
}

/** Public URL for a stored key (CDN/MinIO public endpoint). */
export function publicUrl(key: string): string {
  const base = env.s3.publicUrl.replace(/\/$/, "");
  if (base) return `${base}/${key}`;
  // Fallback: path-style endpoint URL.
  return `${env.s3.endpoint.replace(/\/$/, "")}/${env.s3.bucket}/${key}`;
}

/** Upload a buffer to object storage, returning its key + public URL. */
export async function putObject(
  body: Buffer | Uint8Array,
  mimeType: string,
  prefix = "uploads"
): Promise<StoredObject> {
  const key = `${prefix}/${randomUUID()}.${extFromMime(mimeType)}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    })
  );
  return { key, url: publicUrl(key), mimeType, size: body.byteLength };
}

/** Presigned GET URL (for private buckets without a public CDN). */
export async function signedGetUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.s3.bucket, Key: key }),
    { expiresIn }
  );
}

/** Fetch a remote image (e.g. Behance/Freepik link) and store it. */
export async function storeFromUrl(
  sourceUrl: string,
  prefix = "references"
): Promise<StoredObject> {
  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`Falha ao baixar imagem (${res.status}): ${sourceUrl}`);
  }
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    throw new Error(`URL não aponta para uma imagem: ${mimeType}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const MAX = 10 * 1024 * 1024; // 10MB
  if (buf.byteLength > MAX) {
    throw new Error("Imagem maior que 10MB.");
  }
  return putObject(buf, mimeType, prefix);
}
