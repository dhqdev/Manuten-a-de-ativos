"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { recuperarSenha, type EstadoForm } from "@/app/auth/actions";
import { Alerta } from "@/components/auth/moldura";
import { Botao, Campo } from "@/components/ui";

export function FormRecuperar() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(recuperarSenha, null);

  return (
    <form action={acao} className="space-y-4">
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}
      {estado?.sucesso && <Alerta tipo="sucesso">{estado.sucesso}</Alerta>}

      <Campo label="E-mail" obrigatorio>
        <input name="email" type="email" required autoComplete="email" placeholder="voce@empresa.com.br" className="campo" />
      </Campo>

      <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full justify-center">
        {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {enviando ? "Enviando..." : "Enviar link de recuperação"}
      </Botao>
    </form>
  );
}
