"use client";

import { useActionState } from "react";
import Image from "next/image";
import {
  createGenerationAction,
  type StudioState,
} from "@/app/studio/actions";

type Reference = { id: string; url: string; type: string };

export default function StudioForm({
  brandId,
  references,
}: {
  brandId: string;
  references: Reference[];
}) {
  const [state, formAction, pending] = useActionState<StudioState, FormData>(
    createGenerationAction,
    undefined
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="brandId" value={brandId} />

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">
          O que é o flyer? (tema, oferta, texto principal, data)
        </span>
        <textarea
          name="brief"
          rows={4}
          required
          placeholder="Ex.: Promoção de sexta — combo X-Burguer + batata + refri por R$ 29,90. Válido dia 13/06."
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-violet-500"
        />
      </label>

      {references.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm text-zinc-300">
            Usar uma referência? (opcional — modo imagem-para-imagem)
          </legend>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            <label className="cursor-pointer">
              <input
                type="radio"
                name="referenceAssetId"
                value=""
                defaultChecked
                className="peer sr-only"
              />
              <div className="flex h-24 items-center justify-center rounded-lg border border-zinc-700 text-xs text-zinc-400 peer-checked:border-violet-500 peer-checked:text-violet-300">
                Sem referência
              </div>
            </label>
            {references.map((ref) => (
              <label key={ref.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="referenceAssetId"
                  value={ref.id}
                  className="peer sr-only"
                />
                <div className="relative h-24 overflow-hidden rounded-lg border border-zinc-700 peer-checked:border-violet-500">
                  <Image
                    src={ref.url}
                    alt="referência"
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-violet-600 px-6 py-2.5 font-medium text-white hover:bg-violet-500 disabled:opacity-60 transition"
      >
        {pending ? "Gerando flyer… (pode levar alguns segundos)" : "Gerar flyer"}
      </button>
    </form>
  );
}
