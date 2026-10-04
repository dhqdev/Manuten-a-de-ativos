/**
 * Gera app/tema-escuro.css.
 *
 * O app inteiro usa as escalas do Tailwind (slate, red, amber...). Em vez de
 * espalhar `dark:` por centenas de classes, o modo escuro troca o VALOR das
 * variáveis de cor: slate é invertido (fundo vira escuro, texto vira claro) e
 * as cores de estado viram tons translúcidos no fundo e claros no texto.
 *
 * Rode `node scripts/gerar-tema-escuro.mjs` depois de mudar a paleta.
 */
import { readFileSync, writeFileSync } from "node:fs";

const tema = readFileSync(new URL("../node_modules/tailwindcss/theme.css", import.meta.url), "utf8");
const globais = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

const PASSOS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"];
const FAMILIAS = ["red", "amber", "emerald", "cyan", "orange", "violet", "marca"];

function escala(nome) {
  const fonte = nome === "marca" ? globais : tema;
  const valores = {};
  for (const p of PASSOS) {
    const m = fonte.match(new RegExp(`--color-${nome}-${p}:\\s*([^;]+);`));
    if (!m) throw new Error(`Cor não encontrada: ${nome}-${p}`);
    valores[p] = m[1].trim();
  }
  return valores;
}

/** Slate escuro: cada passo vira o papel oposto, com contraste conferido à mão. */
const SLATE_ESCURO = {
  50: "#0a101d", // fundo da página
  100: "#172033", // preenchimentos sutis, badges
  200: "#232e44", // bordas
  300: "#33405a", // borda de campo
  400: "#64748b", // ícones apagados, placeholder
  500: "#8d9bb1", // texto secundário
  600: "#a9b5c7",
  700: "#c4cedc",
  800: "#dce3ed",
  900: "#eef2f7", // texto principal e botão primário
  950: "#f8fafc",
};
const SUPERFICIE_ESCURA = "#111a2b"; // cartões, folhas e campos

function escuro() {
  const linhas = ["  color-scheme: dark;", `  --color-superficie: ${SUPERFICIE_ESCURA};`];
  for (const p of PASSOS) linhas.push(`  --color-slate-${p}: ${SLATE_ESCURO[p]};`);
  for (const f of FAMILIAS) {
    const o = escala(f);
    const mapa = {
      50: `color-mix(in oklab, ${o[500]} 13%, transparent)`,
      100: `color-mix(in oklab, ${o[500]} 20%, transparent)`,
      200: `color-mix(in oklab, ${o[500]} 30%, transparent)`,
      300: `color-mix(in oklab, ${o[500]} 45%, transparent)`,
      400: o[400],
      500: o[500],
      600: o[500],
      700: o[400],
      800: o[300],
      900: o[200],
      950: o[100],
    };
    for (const p of PASSOS) linhas.push(`  --color-${f}-${p}: ${mapa[p]};`);
  }
  linhas.push(
    "  --shadow-suave: 0 1px 2px 0 rgb(0 0 0 / 0.3);",
    "  --shadow-elevada: 0 8px 24px -6px rgb(0 0 0 / 0.55), 0 2px 6px -2px rgb(0 0 0 / 0.3);",
  );
  return linhas.join("\n");
}

/** Áreas que já são escuras por desenho (menu lateral, painel do login) mantêm a paleta original. */
function original() {
  const linhas = ["  color-scheme: light;", "  --color-superficie: #ffffff;"];
  const slate = escala("slate");
  for (const p of PASSOS) linhas.push(`  --color-slate-${p}: ${slate[p]};`);
  for (const f of FAMILIAS) {
    const o = escala(f);
    for (const p of PASSOS) linhas.push(`  --color-${f}-${p}: ${o[p]};`);
  }
  return linhas.join("\n");
}

const bloco = escuro();
const css = `/* Gerado por scripts/gerar-tema-escuro.mjs — não edite à mão. */

/* Escolhido pelo usuário */
:root.escuro {
${bloco}
}

/* "Automático": segue o sistema */
@media (prefers-color-scheme: dark) {
  :root.tema-sistema {
${bloco.replace(/^/gm, "  ")}
  }
}

:root.escuro .tema-original,
:root.tema-sistema .tema-original {
${original()}
}
`;

writeFileSync(new URL("../app/tema-escuro.css", import.meta.url), css);
console.log("app/tema-escuro.css gerado.");
