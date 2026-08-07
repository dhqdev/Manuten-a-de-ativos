import Link from "next/link";
import { TriangleAlert } from "lucide-react";

export default function ErroConfiguracao() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-lg p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <TriangleAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Banco de dados não configurado</h1>
        <p className="mt-2 text-sm text-slate-600">
          Não foi possível carregar sua empresa. Abra o painel do Supabase, vá em{" "}
          <strong>SQL Editor</strong> e execute o arquivo <code>supabase/schema.sql</code> do projeto.
          Depois, saia e entre novamente.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-marca-600 px-4 py-2 text-sm font-medium text-white hover:bg-marca-700"
          >
            Tentar novamente
          </Link>
          <Link
            href="/auth/sair"
            prefetch={false}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sair
          </Link>
        </div>
      </div>
    </main>
  );
}
