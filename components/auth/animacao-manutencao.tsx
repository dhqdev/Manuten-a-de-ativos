/**
 * Ilustração animada de manutenção (engrenagens girando e uma chave apertando
 * a porca) usada nas telas de entrada. É SVG + CSS: pesa menos de 2 KB, não
 * depende de host externo (a CSP bloquearia) e fica nítida em qualquer tela.
 */

function engrenagem(dentes: number, externo: number, interno: number, fase = 0) {
  const passo = (Math.PI * 2) / dentes;
  const ponto = (r: number, a: number) =>
    `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;

  let d = "";
  for (let i = 0; i < dentes; i++) {
    const a = i * passo + fase;
    d += `${i === 0 ? "M" : "L"}${ponto(interno, a - passo * 0.3)}`;
    d += `L${ponto(externo, a - passo * 0.17)}`;
    d += `L${ponto(externo, a + passo * 0.17)}`;
    d += `L${ponto(interno, a + passo * 0.3)}`;
  }
  return d + "Z";
}

const GRANDE = engrenagem(12, 40, 32);
const PEQUENA = engrenagem(8, 24, 18, Math.PI / 8);

export function AnimacaoManutencao({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 170" className={className} role="img" aria-label="Engrenagens em manutenção">
      {/* Brilho de fundo */}
      <circle cx="118" cy="88" r="70" className="fill-marca-500/10" />

      {/* Engrenagem grande */}
      <g transform="translate(92 92)">
        <g className="anim-girar" style={{ animationDuration: "12s" }}>
          <path d={GRANDE} className="fill-slate-700" />
          <circle r="22" className="fill-slate-800" />
          <circle r="9" className="fill-slate-950" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle
              key={i}
              cx={15 * Math.cos((i * Math.PI) / 3)}
              cy={15 * Math.sin((i * Math.PI) / 3)}
              r="2.4"
              className="fill-slate-600"
            />
          ))}
        </g>
      </g>

      {/* Engrenagem pequena, girando ao contrário */}
      <g transform="translate(138 57.5)">
        <g className="anim-girar-reverso" style={{ animationDuration: "8s" }}>
          <path d={PEQUENA} className="fill-marca-500" />
          <circle r="11" className="fill-marca-700" />
          <circle r="5" className="fill-slate-950" />
        </g>
      </g>

      {/* Porca + chave apertando */}
      <g transform="translate(184 114)">
        <path d="M0 -8 6.93 -4v8L0 8-6.93 4v-8z" className="fill-slate-300" />
        <circle r="3" className="fill-slate-950" />
        <g className="anim-apertar">
          <path
            d="M9 -9A12.7 12.7 0 1 0 9 9"
            fill="none"
            strokeWidth="6.5"
            strokeLinecap="round"
            className="stroke-amber-400"
          />
          <path d="M-9 9 -44 44" strokeWidth="8" strokeLinecap="round" className="stroke-amber-400" />
          <path d="M-30 30 -40 40" strokeWidth="2.5" strokeLinecap="round" className="stroke-amber-600" />
        </g>
      </g>

      {/* Faíscas */}
      <circle cx="200" cy="98" r="2.2" className="anim-faisca fill-amber-300" />
      <circle cx="208" cy="112" r="1.6" className="anim-faisca fill-amber-200" style={{ animationDelay: "0.4s" }} />
      <circle cx="166" cy="98" r="1.8" className="anim-faisca fill-marca-300" style={{ animationDelay: "0.9s" }} />
      <circle cx="52" cy="46" r="2" className="anim-faisca fill-marca-400" style={{ animationDelay: "1.3s" }} />
      <circle cx="40" cy="128" r="1.6" className="anim-faisca fill-slate-500" style={{ animationDelay: "0.7s" }} />
    </svg>
  );
}
