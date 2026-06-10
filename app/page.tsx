import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl">
        <p className="text-sm uppercase tracking-widest text-violet-400 mb-4">
          FlyerPro
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
          Um designer para sua empresa,
          <br />
          com linha editorial que se mantém.
        </h1>
        <p className="mt-6 text-lg text-zinc-400">
          Defina a identidade visual da sua marca uma vez. Cada novo flyer é
          gerado mantendo cores, estilo e tom — como se a mesma pessoa fizesse
          todas as artes.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-lg bg-violet-600 px-6 py-3 font-medium text-white hover:bg-violet-500 transition"
          >
            Começar
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-200 hover:bg-zinc-900 transition"
          >
            Entrar
          </Link>
        </div>
      </div>
    </main>
  );
}
