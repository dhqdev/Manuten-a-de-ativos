"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, Lock, Mail } from "lucide-react";
import { entrar, type EstadoForm } from "@/app/auth/actions";
import { Alerta } from "@/components/auth/moldura";
import { Botao } from "@/components/ui";

export function FormLogin({ destino, avisoInicial }: { destino?: string; avisoInicial?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(entrar, null);
  const [verSenha, setVerSenha] = useState(false);

  const erro = estado?.erro ?? avisoInicial;

  return (
    <form action={acao} className="space-y-5">
      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <input type="hidden" name="redirect" value={destino ?? "/dashboard"} />

      <div>
        <label htmlFor="email" className="rotulo">
          E-mail
        </label>
        <div className="group relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="voce@empresa.com.br"
            className="campo h-12 pl-11"
          />
        </div>
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
        <div className="group relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
          <input
            id="senha"
            name="senha"
            type={verSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="campo h-12 pl-11 pr-12"
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-slate-700"
            aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            {verSenha ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
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
