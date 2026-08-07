"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { definirNovaSenha, type EstadoForm } from "@/app/auth/actions";
import { Alerta } from "@/components/auth/moldura";
import { Botao, Campo } from "@/components/ui";

export function FormNovaSenha() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(definirNovaSenha, null);

  return (
    <form action={acao} className="space-y-4">
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

      <Campo label="Nova senha" obrigatorio>
        <input name="senha" type="password" required minLength={6} autoComplete="new-password" placeholder="••••••••" className="campo" />
      </Campo>
      <Campo label="Confirmar nova senha" obrigatorio>
        <input name="confirmacao" type="password" required minLength={6} autoComplete="new-password" placeholder="••••••••" className="campo" />
      </Campo>

      <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full justify-center">
        {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {enviando ? "Salvando..." : "Salvar nova senha"}
      </Botao>
    </form>
  );
}
