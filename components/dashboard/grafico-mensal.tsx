"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { moeda } from "@/lib/format";

export type PontoMensal = { rotulo: string; valor: number; quantidade: number };

/**
 * Série única (gasto total do mês) → uma cor só, sem legenda.
 * O título do card já nomeia a série.
 */
export function GraficoMensal({ dados }: { dados: PontoMensal[] }) {
  const vazio = dados.every((d) => d.valor === 0);

  if (vazio) {
    return (
      <div className="flex h-64 items-center justify-center px-6 text-center text-sm text-slate-500">
        Nenhum gasto registrado nos últimos 6 meses.
      </div>
    );
  }

  return (
    <div className="h-64 w-full px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 12, left: 4, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke="var(--color-slate-200)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-slate-500)", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={68}
            tick={{ fill: "var(--color-slate-400)", fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k` : String(v)
            }
          />
          <Tooltip
            cursor={{ fill: "var(--color-slate-100)" }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--color-slate-200)",
              backgroundColor: "var(--color-superficie)",
              color: "var(--color-slate-700)",
              boxShadow: "0 4px 12px rgb(15 23 42 / 0.08)",
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--color-slate-900)", fontWeight: 600, marginBottom: 4 }}
            formatter={(valor: number, _nome, item) => [
              `${moeda(valor)} · ${(item?.payload as PontoMensal)?.quantidade ?? 0} manutenção(ões)`,
              "Gasto",
            ]}
          />
          <Bar dataKey="valor" fill="var(--color-marca-600)" radius={[4, 4, 0, 0]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
