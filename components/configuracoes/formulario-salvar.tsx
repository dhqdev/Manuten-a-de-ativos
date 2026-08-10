"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { Botao } from "@/components/ui";
import type { Resultado } from "@/lib/form";

/**
 * Formulário genérico das configurações: envia o FormData para a server action,
 * mostra erro ou confirmação e atualiza a página.
 */
export function FormularioSalvar({
  acao,
  children,
  rotulo = "Salvar alterações",
  mensagemSucesso = "Alterações salvas.",
  limparAoSalvar = false,
}: {
  acao: (fd: FormData) => Promise<Resultado>;
  children: ReactNode;
  rotulo?: string;
  mensagemSucesso?: string;
  limparAoSalvar?: boolean;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [enviando, iniciar] = useTransition();

  function enviar(fd: FormData) {
    setErro(null);
    setSucesso(false);
    iniciar(async () => {
      const r = await acao(fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setSucesso(true);
      if (limparAoSalvar) {
        document.querySelectorAll<HTMLFormElement>("form[data-limpar='1']").forEach((f) => f.reset());
      }
      router.refresh();
      setTimeout(() => setSucesso(false), 4000);
    });
  }

  return (
    <form action={enviar} data-limpar={limparAoSalvar ? "1" : undefined}>
      <div className="space-y-4 px-4 py-5 sm:px-5">
        {erro && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
        {children}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
        {sucesso && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" />
            {mensagemSucesso}
          </span>
        )}
        <Botao type="submit" disabled={enviando}>
          {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {rotulo}
        </Botao>
      </div>
    </form>
  );
}
