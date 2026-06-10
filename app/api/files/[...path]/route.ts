import { readLocalObject } from "@/lib/storage";

// Serve files stored by the "local" storage driver from the app's volume.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const key = segments.join("/");

  const obj = await readLocalObject(key);
  if (!obj) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(obj.body), {
    headers: {
      "Content-Type": obj.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
