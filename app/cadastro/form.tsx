"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { cadastrar, type EstadoForm } from "@/app/auth/actions";
import { Alerta } from "@/components/auth/moldura";
import { Botao, Campo } from "@/components/ui";

export function FormCadastro() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(cadastrar, null);

  if (estado?.sucesso) {
    return <Alerta tipo="sucesso">{estado.sucesso}</Alerta>;
  }

  return (
    <form action={acao} className="space-y-4">
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

      <Campo label="Seu nome" obrigatorio>
        <input name="nome" required autoComplete="name" placeholder="João da Silva" className="campo" />
      </Campo>

      <Campo label="Empresa" hint="Vira o nome do seu espaço de trabalho.">
        <input name="empresa" autoComplete="organization" placeholder="Transportes Silva Ltda" className="campo" />
      </Campo>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="E-mail" obrigatorio>
          <input name="email" type="email" required autoComplete="email" placeholder="voce@empresa.com.br" className="campo" />
        </Campo>
        <Campo label="Telefone">
          <input name="telefone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" className="campo" />
        </Campo>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Senha" obrigatorio hint="Mínimo 6 caracteres.">
          <input name="senha" type="password" required minLength={6} autoComplete="new-password" placeholder="••••••••" className="campo" />
        </Campo>
        <Campo label="Confirmar senha" obrigatorio>
          <input name="confirmacao" type="password" required minLength={6} autoComplete="new-password" placeholder="••••••••" className="campo" />
        </Campo>
      </div>

      <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full justify-center">
        {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {enviando ? "Criando conta..." : "Criar conta"}
      </Botao>
    </form>
  );
}
