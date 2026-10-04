"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que conta até o valor quando aparece — inspirado no "Count Up" do
 * React Bits. Quem pediu menos movimento no sistema vê o valor final direto.
 */
export function Contador({
  valor,
  formato = "numero",
  duracao = 900,
}: {
  valor: number;
  formato?: "numero" | "moeda";
  duracao?: number;
}) {
  const [exibido, setExibido] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setExibido(valor);
      return;
    }

    const de = anterior.current;
    const inicio = performance.now();
    let quadro = 0;

    const passo = (agora: number) => {
      const t = Math.min((agora - inicio) / duracao, 1);
      const suave = 1 - Math.pow(1 - t, 3);
      setExibido(de + (valor - de) * suave);
      if (t < 1) quadro = requestAnimationFrame(passo);
      else anterior.current = valor;
    };

    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [valor, duracao]);

  const texto =
    formato === "moeda"
      ? exibido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : Math.round(exibido).toLocaleString("pt-BR");

  return <span className="tabular-nums">{texto}</span>;
}
