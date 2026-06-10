import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/session";
import { regenerateAction } from "@/app/studio/actions";

export default async function GenerationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { workspace } = await requireWorkspace();

  const generation = await db.generation.findUnique({
    where: { id },
    include: { resultAsset: true, brand: true },
  });

  // Ownership check: brand must belong to the user's workspace.
  if (!generation || generation.brand.workspaceId !== workspace.id) {
    notFound();
  }

  const done = generation.status === "DONE" && generation.resultAsset;
  const failed = generation.status === "ERROR";
  const pending = !done && !failed;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:underline">
        ← Dashboard
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-[3fr_2fr]">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          {done && generation.resultAsset ? (
            <Image
              src={generation.resultAsset.url}
              alt={generation.brief}
              fill
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-400">
              {failed
                ? `Falhou: ${generation.error ?? "erro desconhecido"}`
                : "Processando… atualize a página em alguns segundos."}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
              Briefing
            </h2>
            <p className="mt-1 text-zinc-200">{generation.brief}</p>
          </div>

          {generation.prompt && (
            <div>
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">
                Prompt gerado
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {generation.prompt}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {done && generation.resultAsset && (
              <a
                href={generation.resultAsset.url}
                download
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
              >
                Baixar
              </a>
            )}
            {!pending && (
              <form action={regenerateAction}>
                <input type="hidden" name="generationId" value={generation.id} />
                <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
                  Gerar variação
                </button>
              </form>
            )}
            <Link
              href="/studio"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Novo flyer
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
