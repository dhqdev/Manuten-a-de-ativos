"use client";

import { useCallback, useEffect, useState } from "react";
import { COOKIE_TEMA, COR_BARRA, classeTema, type Tema } from "@/lib/tema";

function temaAtual(): Tema {
  const raiz = document.documentElement.classList;
  if (raiz.contains("escuro")) return "escuro";
  if (raiz.contains("tema-sistema")) return "sistema";
  return "claro";
}

function sistemaEscuro() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function aplicar(tema: Tema) {
  const raiz = document.documentElement;
  raiz.classList.remove("escuro", "tema-sistema");
  const classe = classeTema(tema);
  if (classe) raiz.classList.add(classe);

  // Um ano; vale para o app todo. Não é dado sensível, então pode ser lido no navegador.
  document.cookie = `${COOKIE_TEMA}=${tema}; path=/; max-age=31536000; samesite=lax`;

  const escuro = tema === "escuro" || (tema === "sistema" && sistemaEscuro());
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    m.setAttribute("content", escuro ? COR_BARRA.escuro : COR_BARRA.claro);
  });
}

/** Lê e troca o tema. `escuro` diz o que está na tela agora (resolve o "Automático"). */
export function useTema() {
  const [tema, setTema] = useState<Tema>("claro");
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    const atualizar = () => {
      const t = temaAtual();
      setTema(t);
      setEscuro(t === "escuro" || (t === "sistema" && sistemaEscuro()));
    };
    atualizar();
    const midia = window.matchMedia("(prefers-color-scheme: dark)");
    midia.addEventListener("change", atualizar);
    return () => midia.removeEventListener("change", atualizar);
  }, []);

  const escolher = useCallback((novo: Tema) => {
    aplicar(novo);
    setTema(novo);
    setEscuro(novo === "escuro" || (novo === "sistema" && sistemaEscuro()));
  }, []);

  return { tema, escuro, escolher };
}
