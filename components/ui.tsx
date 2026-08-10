import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/**
 * Grafite é a ação; azul é navegação e estado. Manter essa separação é o que
 * segura a interface sozinha, sem precisar de mais cor.
 */
const VARIANTES = {
  primario:
    "bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 focus-visible:outline-slate-900 shadow-[0_1px_2px_0_rgb(15_23_42/0.12)]",
  secundario:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus-visible:outline-slate-900",
  perigo: "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600",
  sutil: "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline-slate-900",
  fantasma: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-slate-900",
};

const TAMANHOS = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icone: "h-9 w-9 justify-center",
};

const BASE =
  "inline-flex items-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

type BotaoProps = {
  variante?: keyof typeof VARIANTES;
  tamanho?: keyof typeof TAMANHOS;
} & ComponentProps<"button">;

export function Botao({ variante = "primario", tamanho = "md", className, ...props }: BotaoProps) {
  return <button className={cn(BASE, VARIANTES[variante], TAMANHOS[tamanho], className)} {...props} />;
}

type BotaoLinkProps = {
  variante?: keyof typeof VARIANTES;
  tamanho?: keyof typeof TAMANHOS;
} & ComponentProps<typeof Link>;

export function BotaoLink({
  variante = "primario",
  tamanho = "md",
  className,
  ...props
}: BotaoLinkProps) {
  return <Link className={cn(BASE, VARIANTES[variante], TAMANHOS[tamanho], className)} {...props} />;
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className ?? "bg-slate-100 text-slate-600 ring-slate-500/20",
      )}
    >
      {children}
    </span>
  );
}

export function Cabecalho({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-semibold leading-tight text-slate-900 sm:text-2xl">
          {titulo}
        </h1>
        {descricao && <p className="mt-1.5 text-sm text-slate-500">{descricao}</p>}
      </div>
      {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}

export function EstadoVazio({
  icone,
  titulo,
  descricao,
  acao,
}: {
  icone: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icone}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{titulo}</h3>
      {descricao && <p className="mt-1 max-w-sm text-sm text-slate-500">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

export function Campo({
  label,
  hint,
  obrigatorio,
  children,
  className,
}: {
  label: string;
  hint?: string;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="rotulo">
        {label}
        {obrigatorio && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Secao({
  titulo,
  acoes,
  children,
  className,
}: {
  titulo: string;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 className="text-sm font-semibold text-slate-900">{titulo}</h2>
        {acoes}
      </header>
      {children}
    </section>
  );
}
