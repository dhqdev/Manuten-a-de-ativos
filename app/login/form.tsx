"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { entrar, type EstadoForm } from "@/app/auth/actions";
import { CampoIcone, CampoSenha, enviarSemLimpar } from "@/components/auth/campos";
import { Alerta } from "@/components/auth/moldura";
import { Botao } from "@/components/ui";

export function FormLogin({ destino, avisoInicial }: { destino?: string; avisoInicial?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(entrar, null);

  const erro = estado?.erro ?? avisoInicial;

  return (
    <form onSubmit={enviarSemLimpar(acao, startTransition)} className="space-y-5">
      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <input type="hidden" name="redirect" value={destino ?? "/dashboard"} />

      <div>
        <label htmlFor="email" className="rotulo">
          E-mail
        </label>
        <CampoIcone
          Icone={Mail}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="email"
          required
          placeholder="voce@empresa.com.br"
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="senha" className="rotulo">
            Senha
          </label>
          <Link
            href="/recuperar-senha"
            className="mb-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Esqueci minha senha
          </Link>
        </div>
        <CampoSenha
          id="senha"
          name="senha"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </div>

      <Botao
        type="submit"
        disabled={enviando}
        className="group h-12 w-full justify-center text-[15px]"
      >
        {enviando ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Entrando...
          </>
        ) : (
          <>
            Entrar
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Botao>
    </form>
  );
}
