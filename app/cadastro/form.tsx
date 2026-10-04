"use client";

import { startTransition, useActionState, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, LoaderCircle, Mail, MailCheck, Phone, User } from "lucide-react";
import { cadastrar, type EstadoForm } from "@/app/auth/actions";
import { CampoIcone, CampoSenha, ForcaSenha, enviarSemLimpar } from "@/components/auth/campos";
import { Alerta } from "@/components/auth/moldura";
import { BotaoLink, Botao } from "@/components/ui";

export function FormCadastro() {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(cadastrar, null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  if (estado?.sucesso) {
    return (
      <div className="pop-in text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <MailCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Confirme seu e-mail</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Enviamos um link para <strong className="text-slate-800">{email}</strong>. Abra o e-mail e
          toque no link para liberar o acesso.
        </p>
        <p className="mt-3 text-xs text-slate-400">Não chegou? Confira a caixa de spam ou promoções.</p>
        <BotaoLink href="/login" className="mt-6 h-12 w-full justify-center text-[15px]">
          Ir para o login
        </BotaoLink>
      </div>
    );
  }

  const naoConferem = confirmacao.length > 0 && confirmacao !== senha;
  const conferem = confirmacao.length > 0 && confirmacao === senha && senha.length >= 6;

  return (
    <form
      onSubmit={(e) => {
        // Senhas diferentes nem saem do aparelho.
        if (naoConferem) {
          e.preventDefault();
          return;
        }
        enviarSemLimpar(acao, startTransition)(e);
      }}
      className="space-y-4"
    >
      {estado?.erro && <Alerta tipo="erro">{estado.erro}</Alerta>}

      <div>
        <label htmlFor="nome" className="rotulo">Seu nome</label>
        <CampoIcone Icone={User} id="nome" name="nome" required autoComplete="name" placeholder="João da Silva" />
      </div>

      <div>
        <label htmlFor="empresa" className="rotulo">
          Empresa <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <CampoIcone
          Icone={Building2}
          id="empresa"
          name="empresa"
          autoComplete="organization"
          placeholder="Transportes Silva Ltda"
        />
      </div>

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="telefone" className="rotulo">
          WhatsApp <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <CampoIcone
          Icone={Phone}
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
        />
      </div>

      <div>
        <label htmlFor="senha" className="rotulo">Senha</label>
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
        <label htmlFor="confirmacao" className="rotulo">Confirmar senha</label>
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
        {conferem && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Senhas iguais
          </p>
        )}
      </div>

      <Botao
        type="submit"
        disabled={enviando}
        className="group h-12 w-full justify-center text-[15px]"
      >
        {enviando ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Criando conta...
          </>
        ) : (
          <>
            Criar conta grátis
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </Botao>

      <p className="text-center text-xs text-slate-400">
        Sua empresa já começa com as categorias padrão criadas.
      </p>
    </form>
  );
}
