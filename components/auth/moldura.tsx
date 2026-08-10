import type { ReactNode } from "react";
import { Assinatura, Logo, Simbolo } from "@/components/marca";

export function MolduraAuth({
  titulo,
  subtitulo,
  children,
  rodape,
  aviso,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  rodape?: ReactNode;
  aviso?: string;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Painel de marca — só no desktop */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">
        {/* Malha sutil de porcas, bem apagada: textura sem ruído visual */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20 blur-3xl"
          aria-hidden
          style={{ background: "radial-gradient(circle, #2563eb, transparent 70%)" }}
        />

        <div className="relative flex items-center gap-3">
          <Logo tom="claro" />
          <Assinatura tom="claro" />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[2rem] font-semibold leading-[1.15] tracking-tight">
            Toda a manutenção da sua operação em um só lugar.
          </h2>
          <ul className="mt-9 space-y-3.5 text-sm text-slate-400">
            {[
              "Ativos organizados por categoria, como pastas",
              "Histórico completo com custos, peças e anexos",
              "Alertas de preventiva no seu WhatsApp",
              "Relatórios em PDF prontos para compartilhar",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <Simbolo className="mt-0.5 h-4 w-4 shrink-0 text-marca-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} Gestão de Manutenção de Ativos
        </p>
      </aside>

      {/* Formulário */}
      <section className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <Logo />
            <Assinatura />
          </div>

          <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-slate-900">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-2 text-[15px] text-slate-500">{subtitulo}</p>}

          {aviso && (
            <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
              {aviso}
            </p>
          )}

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
