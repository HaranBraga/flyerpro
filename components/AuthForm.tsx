"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { ActionState } from "@/app/(auth)/actions";

type Props = {
  mode: "login" | "signup";
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
};

export default function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    undefined
  );

  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">
        {isSignup ? "Criar conta" : "Entrar"}
      </h1>

      {isSignup && (
        <Field label="Nome" name="name" type="text" autoComplete="name" />
      )}
      <Field label="E-mail" name="email" type="email" autoComplete="email" />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
      />

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-500 disabled:opacity-60 transition"
      >
        {pending ? "Aguarde…" : isSignup ? "Criar conta" : "Entrar"}
      </button>

      <p className="text-sm text-zinc-400">
        {isSignup ? (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="text-violet-400 hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Não tem conta?{" "}
            <Link href="/signup" className="text-violet-400 hover:underline">
              Criar conta
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 outline-none focus:border-violet-500"
      />
    </label>
  );
}
