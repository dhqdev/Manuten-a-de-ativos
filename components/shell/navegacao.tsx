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
  Wrench,
  X,
} from "lucide-react";
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

  const Links = ({ compacto = false }: { compacto?: boolean }) => (
    <nav className={cn("flex flex-col gap-0.5", compacto ? "px-3" : "px-3")}>
      {MENU.map(({ href, rotulo, Icone }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            ativo(href)
              ? "bg-marca-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white",
          )}
        >
          <Icone className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1">{rotulo}</span>
          {href === "/manutencoes" && alertas > 0 && (
            <span
              className={cn(
                "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none",
                ativo(href) ? "bg-white/25 text-white" : "bg-amber-500 text-white",
              )}
            >
              {alertas > 99 ? "99+" : alertas}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );

  const Marca = () => (
    <Link href="/dashboard" className="flex items-center gap-3 px-6 py-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-marca-600">
        <Wrench className="h-[18px] w-[18px] text-white" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-white">Gestão de Manutenção</p>
        <p className="truncate text-xs leading-tight text-slate-400">{nomeEmpresa}</p>
      </div>
    </Link>
  );

  const Rodape = () => (
    <div className="border-t border-slate-800 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
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
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
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
              <Links compacto />
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
