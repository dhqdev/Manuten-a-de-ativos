"use client";

import { startTransition, useActionState } from "react";
import { LoaderCircle, Mail } from "lucide-react";
import { recuperarSenha, type EstadoForm } from "@/app/auth/actions";
import { CampoIcone, enviarSemLimpar } from "@/components/auth/campos";
import { Alerta } from "@/components/auth/moldura";
import { Botao } from "@/components/ui";

export function FormRecuperar() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(recuperarSenha, null);

  return (
    <form onSubmit={enviarSemLimpar(acao, startTransition)} className="space-y-5">
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <div>
        <label htmlFor="email" className="rotulo">E-mail</label>
        <CampoIcone
          Icone={Mail}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          required
          autoComplete="email"
          placeholder="voce@empresa.com.br"
        />
      </div>

      <Botao type="submit" disabled={enviando} className="h-12 w-full justify-center text-[15px]">
        {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {enviando ? "Enviando..." : "Enviar link de recuperação"}
      </Botao>
    </form>
  );
}
