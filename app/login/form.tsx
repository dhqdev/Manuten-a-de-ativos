"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { entrar, type EstadoForm } from "@/app/auth/actions";
import { Alerta } from "@/components/auth/moldura";
import { Botao, Campo } from "@/components/ui";

export function FormLogin({ destino, avisoInicial }: { destino?: string; avisoInicial?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(entrar, null);
  const [verSenha, setVerSenha] = useState(false);

  const erro = estado?.erro ?? avisoInicial;

  return (
    <form action={acao} className="space-y-4">
      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <input type="hidden" name="redirect" value={destino ?? "/dashboard"} />

      <Campo label="E-mail" obrigatorio>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@empresa.com.br"
          className="campo"
        />
      </Campo>

      <Campo label="Senha" obrigatorio>
        <div className="relative">
          <input
            name="senha"
            type={verSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="campo pr-10"
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
            aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Campo>

      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="text-sm text-marca-600 hover:text-marca-700">
          Esqueci minha senha
        </Link>
      </div>

      <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full justify-center">
        {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {enviando ? "Entrando..." : "Entrar"}
      </Botao>
    </form>
  );
}
