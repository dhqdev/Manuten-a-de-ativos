/**
 * Tema da interface. A escolha fica num cookie (não no banco) para o servidor
 * já entregar o HTML com a cor certa — sem piscar branco antes de escurecer.
 */
export type Tema = "claro" | "escuro" | "sistema";

export const COOKIE_TEMA = "tema";

export function lerTema(valor: string | undefined): Tema {
  return valor === "escuro" || valor === "sistema" ? valor : "claro";
}

/** Classe aplicada no <html>. O CSS de app/tema-escuro.css faz o resto. */
export function classeTema(tema: Tema) {
  return tema === "escuro" ? "escuro" : tema === "sistema" ? "tema-sistema" : "";
}

/** Cor da barra do navegador / status bar em cada tema. */
export const COR_BARRA = { claro: "#ffffff", escuro: "#111a2b" } as const;
