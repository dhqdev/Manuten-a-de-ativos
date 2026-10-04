"use client";

import { startTransition, useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { definirNovaSenha, type EstadoForm } from "@/app/auth/actions";
import { CampoSenha, ForcaSenha, enviarSemLimpar } from "@/components/auth/campos";
import { Alerta } from "@/components/auth/moldura";
import { Botao } from "@/components/ui";

export function FormNovaSenha() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(definirNovaSenha, null);
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const naoConferem = confirmacao.length > 0 && confirmacao !== senha;

  return (
    <form
      onSubmit={(e) => {
        if (naoConferem) return e.preventDefault();
        enviarSemLimpar(acao, startTransition)(e);
      }}
      className="space-y-4"
    >
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

      <div>
        <label htmlFor="senha" className="rotulo">Nova senha</label>
        <CampoSenha
          id="senha"
          name="senha"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <ForcaSenha senha={senha} />
      </div>
      <div>
        <label htmlFor="confirmacao" className="rotulo">Confirmar nova senha</label>
        <CampoSenha
          id="confirmacao"
          name="confirmacao"
          required
          minLength={6}
          autoComplete="new-password"
          placeholder="Repita a senha"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          aria-invalid={naoConferem}
          className={naoConferem ? "border-red-400" : undefined}
        />
        {naoConferem && <p className="mt-1.5 text-xs text-red-600">As senhas não conferem.</p>}
      </div>

      <Botao type="submit" disabled={enviando} className="h-12 w-full justify-center text-[15px]">
        {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {enviando ? "Salvando..." : "Salvar nova senha"}
      </Botao>
    </form>
  );
}
