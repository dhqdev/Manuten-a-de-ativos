import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { Assinatura, Logo } from "@/components/marca";
import { AlternarTema } from "@/components/tema/alternar-tema";
import { AnimacaoManutencao } from "./animacao-manutencao";

const DESTAQUES = [
  "Ativos organizados por categoria, como pastas",
  "Histórico completo com custos, peças e anexos",
  "Alertas de preventiva no seu WhatsApp",
  "Relatórios em PDF prontos para compartilhar",
];

/** Fundo do painel escuro: malha de pontos + brilho azul. */
function Textura() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-25 blur-3xl"
        aria-hidden
        style={{ background: "radial-gradient(circle, #2563eb, transparent 70%)" }}
      />
    </>
  );
}

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
    <main className="flex min-h-dvh flex-col bg-[#020617] lg:grid lg:grid-cols-[1.05fr_1fr] lg:bg-superficie">
      {/* ---------- Topo animado (celular) ---------- */}
      <header className="tema-original area-segura-superior relative overflow-hidden bg-slate-950 text-white lg:hidden">
        <Textura />
        <div className="relative flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2.5">
            <Logo tom="claro" tamanho="sm" />
            <Assinatura tom="claro" />
          </div>
          <AlternarTema className="text-slate-400 active:bg-white/10" />
        </div>
        <AnimacaoManutencao className="entrada-pagina relative mx-auto mb-5 mt-1 h-40 w-auto" />
      </header>

      {/* ---------- Painel de marca (desktop) ---------- */}
      <aside className="tema-original relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">
        <Textura />

        <div className="relative flex items-center gap-3">
          <Logo tom="claro" />
          <Assinatura tom="claro" />
        </div>

        <div className="relative max-w-md">
          <AnimacaoManutencao className="entrada-pagina -ml-4 mb-6 h-52 w-auto" />
          <h2 className="text-[2rem] font-semibold leading-[1.15] tracking-tight">
            Toda a manutenção da sua operação em um só lugar.
          </h2>
          <ul className="lista-escalonada mt-8 space-y-3.5 text-sm text-slate-400">
            {DESTAQUES.map((t) => (
              <li key={t} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-marca-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} Gestão de Manutenção de Ativos
        </p>
      </aside>

      {/* ---------- Formulário ---------- */}
      <section className="area-segura-inferior relative z-10 -mt-5 flex flex-1 justify-center rounded-t-[28px] bg-superficie px-5 pb-10 pt-8 shadow-[0_-8px_30px_rgb(0_0_0/0.25)] sm:px-6 lg:mt-0 lg:items-center lg:rounded-none lg:py-12 lg:shadow-none">
        <div className="hidden lg:absolute lg:right-6 lg:top-6 lg:block">
          <AlternarTema className="text-slate-500 hover:bg-slate-100 hover:text-slate-900" />
        </div>

        <div className="entrada-pagina w-full max-w-sm">
          <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[26px]">
            {titulo}
          </h1>
          {subtitulo && <p className="mt-1.5 text-[15px] text-slate-500">{subtitulo}</p>}

          {aviso && (
            <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
              {aviso}
            </p>
          )}

          <div className="mt-7">{children}</div>

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
          ? "pop-in rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
          : "pop-in rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700"
      }
    >
      {children}
    </div>
  );
}
