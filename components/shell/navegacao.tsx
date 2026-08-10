"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  Building2,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  X,
} from "lucide-react";
import { Assinatura, Logo } from "@/components/marca";
import { cn } from "@/components/ui";
import { iniciais } from "@/lib/format";

const MENU = [
  { href: "/dashboard", rotulo: "Dashboard", Icone: LayoutDashboard },
  { href: "/ativos", rotulo: "Ativos", Icone: Package },
  { href: "/manutencoes", rotulo: "Manutenções", Icone: ClipboardList },
  { href: "/calendario", rotulo: "Calendário", Icone: CalendarDays },
  { href: "/relatorios", rotulo: "Relatórios", Icone: ChartColumn },
  { href: "/configuracoes", rotulo: "Configurações", Icone: Settings },
];

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
  const [aberto, setAberto] = useState(false);

  useEffect(() => setAberto(false), [pathname]);

  const ativo = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const Links = () => (
    <nav className="flex flex-col gap-0.5 px-3">
      {MENU.map(({ href, rotulo, Icone }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
            ativo(href)
              ? "bg-white/10 font-medium text-white"
              : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
          )}
        >
          {ativo(href) && (
            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-marca-400" />
          )}
          <Icone
            className={cn(
              "h-[18px] w-[18px] shrink-0 transition-colors",
              ativo(href) ? "text-marca-400" : "text-slate-500 group-hover:text-slate-300",
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
  );

  const Marca = () => (
    <Link href="/dashboard" className="flex items-center gap-3 px-5 py-5">
      <Logo tom="claro" />
      <Assinatura empresa={nomeEmpresa} tom="claro" />
    </Link>
  );

  const Rodape = () => (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white ring-1 ring-white/15">
          {iniciais(nomeUsuario)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight text-white">{nomeUsuario}</p>
          <p className="truncate text-xs leading-tight text-slate-400">{emailUsuario}</p>
        </div>
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
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-900 lg:flex">
        <Marca />
        <div className="flex-1 overflow-y-auto py-2">
          <Links />
        </div>
        <Rodape />
      </aside>

      {/* Drawer mobile */}
      {aberto && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setAberto(false)} aria-hidden />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col bg-slate-900">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="absolute right-3 top-5 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Marca />
            <div className="flex-1 overflow-y-auto py-2">
              <Links />
            </div>
            <Rodape />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        {/* Topo mobile */}
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setAberto(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate text-sm font-medium text-slate-900">{nomeEmpresa}</span>
          </div>
          <Link
            href="/manutencoes?filtro=alertas"
            className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Alertas"
          >
            <Bell className="h-5 w-5" />
            {alertas > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                {alertas > 9 ? "9+" : alertas}
              </span>
            )}
          </Link>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
