"use client";

import { useActionState } from "react";
import { createBrandAction, type OnboardingState } from "@/app/onboarding/actions";

export default function OnboardingForm() {
  const [state, formAction, pending] = useActionState<OnboardingState, FormData>(
    createBrandAction,
    undefined
  );

  return (
    <form action={formAction} className="w-full max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurar sua marca</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Isso define a linha editorial. Cada flyer gerado vai seguir essa
          identidade.
        </p>
      </div>

      <Text label="Nome da marca" name="name" required />
      <Text label="Segmento (ex.: hamburgueria, academia)" name="industry" />

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">
          Descreva a marca e o estilo que você gosta
        </span>
        <textarea
          name="description"
          rows={3}
          placeholder="Ex.: marca jovem e divertida, cores vibrantes, estilo street food…"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-violet-500"
        />
      </label>

      <FileField
        label="Logo (PNG/JPG)"
        name="logo"
        accept="image/*"
        hint="Usamos para extrair a paleta de cores da marca."
      />

      <FileField
        label="Artes atuais da empresa (pode selecionar várias)"
        name="arts"
        accept="image/*"
        multiple
        hint="Servem de referência da sua linha visual."
      />

      <label className="block">
        <span className="mb-1 block text-sm text-zinc-300">
          Links de inspiração (Behance/Freepik) — um por linha
        </span>
        <textarea
          name="references"
          rows={2}
          placeholder="https://…"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-violet-500"
        />
        <span className="mt-1 block text-xs text-zinc-500">
          Use apenas referências que você tem direito de usar. Ficam privadas na
          sua conta.
        </span>
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-500 disabled:opacity-60 transition"
      >
        {pending ? "Salvando marca…" : "Criar marca e continuar"}
      </button>
    </form>
  );
}

function Text({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      <input
        name={name}
        type="text"
        required={required}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-violet-500"
      />
    </label>
  );
}

function FileField({
  label,
  name,
  accept,
  multiple,
  hint,
}: {
  label: string;
  name: string;
  accept?: string;
  multiple?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      <input
        name={name}
        type="file"
        accept={accept}
        multiple={multiple}
        className="w-full text-sm text-zinc-400 file:mr-3 file:rounded-md file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-white hover:file:bg-violet-500"
      />
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
