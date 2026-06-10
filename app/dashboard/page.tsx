import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/session";
import { logoutAction } from "@/app/(auth)/actions";

export default async function DashboardPage() {
  const { workspace } = await requireWorkspace();
  const brand = workspace.brands[0];

  const generations = brand
    ? await db.generation.findMany({
        where: { brandId: brand.id },
        include: { resultAsset: true },
        orderBy: { createdAt: "desc" },
        take: 24,
      })
    : [];

  const palette = (brand?.palette as string[] | null) ?? [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{workspace.name}</h1>
          {brand?.industry && (
            <p className="text-sm text-zinc-400">{brand.industry}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="rounded-lg bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-500 transition"
          >
            + Novo flyer
          </Link>
          <form action={logoutAction}>
            <button className="text-sm text-zinc-400 hover:text-zinc-200">
              Sair
            </button>
          </form>
        </div>
      </header>

      {palette.length > 0 && (
        <div className="mt-6 flex items-center gap-2">
          <span className="text-xs text-zinc-500">Paleta da marca:</span>
          {palette.map((c) => (
            <span
              key={c}
              title={c}
              className="h-5 w-5 rounded-full border border-zinc-700"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-zinc-400">
          Flyers gerados
        </h2>
        {generations.length === 0 ? (
          <p className="text-zinc-500">
            Nenhum flyer ainda.{" "}
            <Link href="/studio" className="text-violet-400 hover:underline">
              Gerar o primeiro
            </Link>
            .
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {generations.map((g) => (
              <Link
                key={g.id}
                href={`/generations/${g.id}`}
                className="group block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900"
              >
                <div className="relative aspect-[4/5] bg-zinc-950">
                  {g.resultAsset ? (
                    <Image
                      src={g.resultAsset.url}
                      alt={g.brief}
                      fill
                      sizes="240px"
                      className="object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                      {g.status === "ERROR" ? "Erro" : "Processando…"}
                    </div>
                  )}
                </div>
                <p className="truncate px-2 py-1.5 text-xs text-zinc-400">
                  {g.brief}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
