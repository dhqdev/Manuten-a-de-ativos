import Link from "next/link";
import { moeda } from "@/lib/format";

export type GastoCategoria = {
  id: string;
  nome: string;
  cor: string;
  valor: number;
  quantidade: number;
};

/**
 * Comparação de magnitude entre categorias.
 * Cada barra usa a cor da própria categoria (a mesma do resto do sistema) e
 * carrega nome + valor como rótulo direto — a identidade nunca depende só da cor.
 */
export function BarrasCategoria({ dados }: { dados: GastoCategoria[] }) {
  if (dados.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-slate-500">
        Nenhum gasto registrado ainda.
      </div>
    );
  }

  const maior = Math.max(...dados.map((d) => d.valor), 1);
  const total = dados.reduce((s, d) => s + d.valor, 0);

  return (
    <ul className="space-y-3.5 px-4 py-5 sm:px-5">
      {dados.map((d) => {
        const percentual = total > 0 ? (d.valor / total) * 100 : 0;
        return (
          <li key={d.id}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <Link
                href={`/ativos/categoria/${d.id}`}
                className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.cor }}
                  aria-hidden
                />
                <span className="truncate">{d.nome}</span>
              </Link>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                {moeda(d.valor)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max((d.valor / maior) * 100, 2)}%`, backgroundColor: d.cor }}
                />
              </div>
              <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-500">
                {percentual.toFixed(0)}% · {d.quantidade}x
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
