"use client";

import dynamic from "next/dynamic";

/**
 * O recharts é a biblioteca mais pesada do dashboard. Carregá-lo à parte deixa
 * os números e listas aparecerem antes; o gráfico chega logo em seguida.
 */
export const GraficoMensalLazy = dynamic(
  () => import("./grafico-mensal").then((m) => m.GraficoMensal),
  {
    ssr: false,
    loading: () => <div className="reluzente m-4 h-56 rounded-lg" aria-hidden />,
  },
);
