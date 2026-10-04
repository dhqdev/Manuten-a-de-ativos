"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChartColumn,
  CircleDot,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Package,
  Settings,
  LayoutGrid,
  X,
} from "lucide-react";
import { Assinatura, Logo } from "@/components/marca";
import { cn } from "@/components/ui";
import { AlternarTema } from "@/components/tema/alternar-tema";
import { iniciais } from "@/lib/format";

type Item = { href: string; rotulo: string; Icone: LucideIcon };

const MENU: Item[] = [
  { href: "/dashboard", rotulo: "Dashboard", Icone: LayoutDashboard },
  { href: "/ativos", rotulo: "Ativos", Icone: Package },
  { href: "/manutencoes", rotulo: "Manutenções", Icone: ClipboardList },
  { href: "/calendario", rotulo: "Calendário", Icone: CalendarDays },
  { href: "/estoque", rotulo: "Estoque", Icone: CircleDot },
  { href: "/relatorios", rotulo: "Relatórios", Icone: ChartColumn },
  { href: "/configuracoes", rotulo: "Configurações", Icone: Settings },
];

/** Na barra inferior cabem 4 com conforto; o resto vai para o menu suspenso. */
const NA_BARRA = MENU.slice(0, 4);
const NO_MENU = MENU.slice(4);

export function Navegacao({
  nomeUsuario,
  emailUsuario,
  nomeEmpresa,
  alertas,
  children,
}: {
  nomeUsuario: string;
  emailUsuario: string;
  nomeEmpresa: string;
  alertas: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => setMenuAberto(false), [pathname]);

  useEffect(() => {
    if (!menuAberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenuAberto(false);
    document.addEventListener("keydown", esc);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = anterior;
    };
  }, [menuAberto]);

  const ativo = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const algumNoMenu = NO_MENU.some((i) => ativo(i.href));

  return (
    <div className="min-h-dvh lg:flex">
      {/* ---------------- Sidebar (desktop) ---------------- */}
      <aside className="tema-original no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 lg:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5">
          <Logo tom="claro" />
          <Assinatura empresa={nomeEmpresa} tom="claro" />
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
          {MENU.map(({ href, rotulo, Icone }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "pressionavel group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                ativo(href)
                  ? "bg-white/10 font-medium text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
              )}
            >
              {ativo(href) && (
                <span className="pop-in absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-marca-400" />
              )}
              <Icone
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  ativo(href)
                    ? "text-marca-400"
                    : "text-slate-500 group-hover:translate-x-0.5 group-hover:text-slate-300",
                )}
              />
              <span className="flex-1">{rotulo}</span>
              {href === "/manutencoes" && alertas > 0 && (
                <span className="min-w-5 rounded-full bg-amber-500/90 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-slate-950">
                  {alertas > 99 ? "99+" : alertas}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-white/15">
              {iniciais(nomeUsuario)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight text-white">{nomeUsuario}</p>
              <p className="truncate text-xs leading-tight text-slate-400">{emailUsuario}</p>
            </div>
            <AlternarTema className="text-slate-400 hover:bg-white/10 hover:text-white" />
            <Link
              href="/auth/sair"
              prefetch={false}
              title="Sair"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        {/* ---------------- Topo (celular) ---------------- */}
        <header className="no-print area-segura-superior sticky top-0 z-20 border-b border-slate-200 bg-superficie/95 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2.5 px-4 py-2">
            <Logo tamanho="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-slate-900">
                {nomeEmpresa}
              </p>
              <p className="truncate text-[11px] leading-tight text-slate-500">{nomeUsuario}</p>
            </div>
            <AlternarTema className="text-slate-500 active:bg-slate-100" />
            <Link
              href="/manutencoes?filtro=alertas"
              className="relative rounded-lg p-2 text-slate-500 transition-colors active:bg-slate-100"
              aria-label={`Alertas${alertas > 0 ? `: ${alertas}` : ""}`}
            >
              <Bell className="h-5 w-5" />
              {alertas > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-black/80">
                  {alertas > 9 ? "9+" : alertas}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-4 sm:p-6 sm:pb-[calc(6rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-8">
          <div key={pathname} className="entrada-pagina mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* ---------------- Menu suspenso (celular) ---------------- */}
      {menuAberto && (
        <div className="no-print fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <div
            className="veu absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setMenuAberto(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="folha area-segura-inferior relative rounded-t-2xl bg-superficie pb-2 shadow-xl"
          >
            <div className="flex justify-center pt-2.5" aria-hidden>
              <span className="h-1 w-9 rounded-full bg-slate-300" />
            </div>

            <header className="flex items-center justify-between px-5 pb-1 pt-3">
              <h2 className="text-base font-semibold text-slate-900">Menu</h2>
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="-mr-1 rounded-lg p-1.5 text-slate-400 active:bg-slate-100"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Quadrados */}
            <div className="grid grid-cols-3 gap-3 px-5 pb-4 pt-3">
              {[...NO_MENU, ...NA_BARRA].map(({ href, rotulo, Icone }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "pressionavel flex h-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border text-center",
                    ativo(href)
                      ? "border-slate-900 bg-slate-900 text-slate-50"
                      : "border-slate-200 bg-slate-50 text-slate-700 active:bg-slate-100",
                  )}
                >
                  <Icone className="h-6 w-6" />
                  <span className="px-1 text-[12px] font-medium leading-tight">{rotulo}</span>
                </Link>
              ))}

              <Link
                href="/auth/sair"
                prefetch={false}
                className="pressionavel flex h-[5.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-center text-red-700 active:bg-red-100"
              >
                <LogOut className="h-6 w-6" />
                <span className="px-1 text-[12px] font-medium leading-tight">Sair</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Barra inferior (celular) ---------------- */}
      <nav
        className="no-print area-segura-inferior fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-superficie/95 backdrop-blur lg:hidden"
        aria-label="Navegação principal"
      >
        <div className="grid grid-cols-5">
          {NA_BARRA.map(({ href, rotulo, Icone }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "pressionavel relative flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10.5px] font-medium",
                ativo(href) ? "text-slate-900" : "text-slate-500 active:text-slate-900",
              )}
            >
              <span
                className={cn(
                  "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                  ativo(href) && "bg-slate-100",
                )}
              >
                <Icone className={cn("h-5 w-5", ativo(href) && "stroke-[2.3]")} />
                {href === "/manutencoes" && alertas > 0 && (
                  <span className="absolute -top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-black/80">
                    {alertas > 9 ? "9+" : alertas}
                  </span>
                )}
              </span>
              {rotulo}
            </Link>
          ))}

          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            aria-expanded={menuAberto}
            className={cn(
              "pressionavel relative flex flex-col items-center gap-0.5 pb-1.5 pt-2 text-[10.5px] font-medium",
              algumNoMenu || menuAberto ? "text-slate-900" : "text-slate-500 active:text-slate-900",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                (algumNoMenu || menuAberto) && "bg-slate-100",
              )}
            >
              <LayoutGrid className={cn("h-5 w-5", algumNoMenu && "stroke-[2.3]")} />
            </span>
            Mais
          </button>
        </div>
      </nav>
    </div>
  );
}
