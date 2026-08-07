import { Wrench } from "lucide-react";
import type { ReactNode } from "react";

export function MolduraAuth({
  titulo,
  subtitulo,
  children,
  rodape,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  rodape?: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Painel de marca — só no desktop */}
      <aside className="relative hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(60rem 40rem at 15% 0%, rgba(37,99,235,.35), transparent 60%), radial-gradient(50rem 30rem at 90% 100%, rgba(14,116,144,.30), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-marca-600">
            <Wrench className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Gestão de Manutenção</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Toda a manutenção da sua operação em um só lugar.
          </h2>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            {[
              "Ativos organizados por categoria, como pastas",
              "Histórico completo com custos, peças e anexos",
              "Alertas automáticos de manutenção preventiva",
              "Relatórios em PDF prontos para o WhatsApp",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-marca-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-400">
          © {new Date().getFullYear()} Gestão de Manutenção de Ativos
        </p>
      </aside>

      {/* Formulário */}
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-marca-600 text-white">
              <Wrench className="h-5 w-5" />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              Gestão de Manutenção
            </span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
          {subtitulo && <p className="mt-1.5 text-sm text-slate-500">{subtitulo}</p>}

          <div className="mt-8">{children}</div>

          {rodape && <div className="mt-6 text-center text-sm text-slate-600">{rodape}</div>}
        </div>
      </section>
    </main>
  );
}

export function Alerta({ tipo, children }: { tipo: "erro" | "sucesso"; children: ReactNode }) {
  return (
    <div
      role="alert"
      className={
        tipo === "erro"
          ? "rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          : "rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700"
      }
    >
      {children}
    </div>
  );
}
