import Link from "next/link";
import { Simbolo } from "@/components/marca";

export const dynamic = "force-dynamic";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-50 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-slate-50">
        <Simbolo className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Página não encontrada</h1>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          O endereço que você abriu não existe ou foi movido.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex h-11 items-center rounded-lg bg-slate-900 px-5 text-sm font-medium text-slate-50"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
