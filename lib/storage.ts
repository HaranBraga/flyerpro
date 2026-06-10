import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { env } from "./env";

// Two storage drivers, selected by STORAGE_DRIVER:
//   "local" (default) → grava num volume do app, servido por /api/files/<key>
//   "s3"              → MinIO / Cloudflare R2 (qualquer S3-compatível)

export type StoredObject = {
  key: string;
  url: string;
  mimeType: string;
  size: number;
};

const isLocal = env.storage.driver !== "s3";

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

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

function newKey(prefix: string, mimeType: string): string {
  return `${prefix}/${randomUUID()}.${extFromMime(mimeType)}`;
}

// ---------------------------------------------------------------------------
// Local driver
// ---------------------------------------------------------------------------

const uploadsRoot = path.resolve(process.cwd(), env.storage.uploadsDir);

/** Resolve a storage key to an absolute path, blocking path traversal. */
function localPath(key: string): string {
  const full = path.resolve(uploadsRoot, key);
  if (full !== uploadsRoot && !full.startsWith(uploadsRoot + path.sep)) {
    throw new Error("Invalid storage key.");
  }
  return full;
}

async function localPut(body: Buffer, key: string): Promise<void> {
  const full = localPath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body);
}

/** Read a stored object from the local volume (used by /api/files). */
export async function readLocalObject(
  key: string
): Promise<{ body: Buffer; mimeType: string } | null> {
  try {
    const full = localPath(key);
    const body = await fs.readFile(full);
    const ext = path.extname(full).replace(".", "");
    return { body, mimeType: mimeFromExt(ext) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// S3 driver (lazy — only loaded when STORAGE_DRIVER=s3)
// ---------------------------------------------------------------------------

type S3Module = typeof import("@aws-sdk/client-s3");
let s3Client: InstanceType<S3Module["S3Client"]> | null = null;
let s3mod: S3Module | null = null;

async function getS3(): Promise<{ client: InstanceType<S3Module["S3Client"]>; mod: S3Module }> {
  if (!s3mod) s3mod = await import("@aws-sdk/client-s3");
  if (!s3Client) {
    s3Client = new s3mod.S3Client({
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
  }
  return { client: s3Client, mod: s3mod };
}

// ---------------------------------------------------------------------------
// Public API (driver-agnostic)
// ---------------------------------------------------------------------------

/** Public URL for a stored key. */
export function publicUrl(key: string): string {
  if (isLocal) {
    return `${env.appUrl.replace(/\/$/, "")}/api/files/${key}`;
  }
  const base = env.s3.publicUrl.replace(/\/$/, "");
  if (base) return `${base}/${key}`;
  return `${env.s3.endpoint.replace(/\/$/, "")}/${env.s3.bucket}/${key}`;
}

/** Upload a buffer, returning its key + public URL. */
export async function putObject(
  body: Buffer | Uint8Array,
  mimeType: string,
  prefix = "uploads"
): Promise<StoredObject> {
  const buf = Buffer.from(body);
  const key = newKey(prefix, mimeType);

  if (isLocal) {
    await localPut(buf, key);
  } else {
    const { client, mod } = await getS3();
    await client.send(
      new mod.PutObjectCommand({
        Bucket: env.s3.bucket,
        Key: key,
        Body: buf,
        ContentType: mimeType,
      })
    );
  }
  return { key, url: publicUrl(key), mimeType, size: buf.byteLength };
}

/** URL to read an object (presigned for private S3; public URL for local). */
export async function signedGetUrl(key: string, expiresIn = 3600): Promise<string> {
  if (isLocal) return publicUrl(key);
  const { client, mod } = await getS3();
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  return getSignedUrl(
    client,
    new mod.GetObjectCommand({ Bucket: env.s3.bucket, Key: key }),
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
