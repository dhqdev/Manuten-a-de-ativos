"use client";

import { useEffect, useRef } from "react";

/**
 * Faíscas no clique — inspirado no "Click Spark" do React Bits, reescrito sem
 * dependência. Um canvas fixo, transparente e que não intercepta o mouse,
 * desenha alguns traços curtos saindo do ponto clicado.
 *
 * Só reage a cliques em elementos clicáveis (botões, links, abas), para não
 * virar ruído. Quem pediu menos movimento no sistema não vê nada.
 */
export function FaiscaClique({
  cor = "#3b82f6",
  quantidade = 8,
  raio = 18,
  duracao = 420,
}: {
  cor?: string;
  quantidade?: number;
  raio?: number;
  duracao?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    type Faisca = { x: number; y: number; angulo: number; inicio: number };
    let faiscas: Faisca[] = [];
    let quadro = 0;

    const ajustar = () => {
      const dpr = window.devicePixelRatio || 1;
      el.width = window.innerWidth * dpr;
      el.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ajustar();

    const suavizar = (t: number) => t * (2 - t);

    const desenhar = (agora: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      faiscas = faiscas.filter((f) => {
        const t = (agora - f.inicio) / duracao;
        if (t >= 1) return false;
        const p = suavizar(t);
        const distancia = p * raio;
        const tamanho = 7 * (1 - p);
        const x1 = f.x + distancia * Math.cos(f.angulo);
        const y1 = f.y + distancia * Math.sin(f.angulo);
        const x2 = f.x + (distancia + tamanho) * Math.cos(f.angulo);
        const y2 = f.y + (distancia + tamanho) * Math.sin(f.angulo);
        ctx.strokeStyle = cor;
        ctx.globalAlpha = 1 - t;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return true;
      });
      ctx.globalAlpha = 1;
      quadro = faiscas.length ? requestAnimationFrame(desenhar) : 0;
    };

    const clicar = (e: PointerEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (!alvo?.closest("button, a, [role='button'], [role='option'], summary, label")) return;
      if (alvo.closest("[data-sem-faisca]")) return;

      const agora = performance.now();
      for (let i = 0; i < quantidade; i++) {
        faiscas.push({ x: e.clientX, y: e.clientY, angulo: (2 * Math.PI * i) / quantidade, inicio: agora });
      }
      if (!quadro) quadro = requestAnimationFrame(desenhar);
    };

    window.addEventListener("resize", ajustar);
    window.addEventListener("pointerdown", clicar, { passive: true });
    return () => {
      window.removeEventListener("resize", ajustar);
      window.removeEventListener("pointerdown", clicar);
      cancelAnimationFrame(quadro);
    };
  }, [cor, quantidade, raio, duracao]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="no-print pointer-events-none fixed inset-0 z-[100] h-full w-full"
    />
  );
}
