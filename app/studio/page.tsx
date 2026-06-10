import Link from "next/link";
import { db } from "@/lib/db";
import { requireWorkspace } from "@/lib/session";
import StudioForm from "@/components/StudioForm";

export default async function StudioPage() {
  const { workspace } = await requireWorkspace();
  const brand = workspace.brands[0];

  if (!brand) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-zinc-300">
          Você ainda não tem uma marca.{" "}
          <Link href="/onboarding" className="text-violet-400 hover:underline">
            Configurar agora
          </Link>
        </p>
      </main>
    );
  }

  const references = await db.asset.findMany({
    where: { brandId: brand.id, type: { in: ["PAST_ART", "REFERENCE"] } },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-zinc-400 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">
        Novo flyer · {brand.name}
      </h1>
      <p className="mt-1 mb-8 text-sm text-zinc-400">
        Descreva o flyer. A IA mantém a identidade visual da marca
        automaticamente.
      </p>
      <StudioForm
        brandId={brand.id}
        references={references.map((r) => ({
          id: r.id,
          url: r.url,
          type: r.type,
        }))}
      />
    </main>
  );
}
