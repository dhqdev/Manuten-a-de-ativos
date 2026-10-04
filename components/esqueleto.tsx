import { cn } from "@/components/ui";

/** Bloco cinza pulsante usado enquanto a tela carrega. */
export function Bloco({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("reluzente rounded-md", className)} style={style} />;
}

export function CabecalhoEsqueleto({ comAcoes = true }: { comAcoes?: boolean }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Bloco className="h-7 w-52" />
        <Bloco className="mt-2 h-4 w-72" />
      </div>
      {comAcoes && (
        <div className="flex gap-2">
          <Bloco className="h-10 w-32" />
          <Bloco className="h-10 w-40" />
        </div>
      )}
    </div>
  );
}

export function CartoesEsqueleto({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Bloco className="h-3 w-24" />
              <Bloco className="mt-3 h-7 w-20" />
            </div>
            <Bloco className="h-10 w-10 rounded-xl" />
          </div>
          <Bloco className="mt-3 h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function ListaEsqueleto({ linhas = 5 }: { linhas?: number }) {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: linhas }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <Bloco className="h-2 w-2 rounded-full" />
          <div className="min-w-0 flex-1">
            <Bloco className="h-4 w-2/3" />
            <Bloco className="mt-2 h-3 w-1/3" />
          </div>
          <Bloco className="h-4 w-20" />
        </li>
      ))}
    </ul>
  );
}

export function PainelEsqueleto({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      <header className="border-b border-slate-200 px-4 py-3.5 sm:px-5">
        <Bloco className="h-4 w-48" />
      </header>
      {children}
    </section>
  );
}
