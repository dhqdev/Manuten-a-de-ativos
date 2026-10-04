"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  KeyRound,
  LoaderCircle,
  MessageCircle,
  ShieldCheck,
  UserPlus,
  Users,
  Wand2,
} from "lucide-react";
import { BotaoExcluir } from "@/components/confirmar";
import { Modal, RodapeModal } from "@/components/modal";
import { Badge, Botao, Campo, Secao, cn } from "@/components/ui";
import {
  alterarPapel,
  criarUsuario,
  redefinirSenha,
  removerMembro,
  type Credenciais,
} from "@/lib/actions/equipe";
import { dataBR, iniciais } from "@/lib/format";
import type { PapelMembro } from "@/lib/types";

const PAPEIS: Record<PapelMembro, { label: string; classe: string; descricao: string }> = {
  proprietario: {
    label: "Proprietário",
    classe: "bg-marca-50 text-marca-700 ring-marca-600/20",
    descricao: "Acesso total, inclusive à equipe",
  },
  gestor: {
    label: "Gestor",
    classe: "bg-violet-50 text-violet-700 ring-violet-600/20",
    descricao: "Cadastra e exclui tudo, gerencia a equipe",
  },
  tecnico: {
    label: "Técnico",
    classe: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    descricao: "Registra manutenções e movimenta pneus",
  },
  leitor: {
    label: "Leitor",
    classe: "bg-slate-100 text-slate-600 ring-slate-500/20",
    descricao: "Somente consulta",
  },
};

const CONVIDAVEIS: PapelMembro[] = ["gestor", "tecnico", "leitor"];

export type Membro = {
  user_id: string;
  papel: PapelMembro;
  created_at: string;
  nome: string | null;
  email: string | null;
  cargo: string | null;
};

export function PainelEquipe({
  membros,
  userId,
  podeGerenciar,
  urlSistema,
}: {
  membros: Membro[];
  userId: string;
  podeGerenciar: boolean;
  urlSistema: string;
}) {
  const [credenciais, setCredenciais] = useState<Extract<Credenciais, { ok: true }> | null>(null);

  return (
    <Secao
      titulo="Equipe e acessos"
      acoes={
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="h-3.5 w-3.5" />
          {membros.length} pessoa(s)
        </span>
      }
    >
      <ul className="lista-escalonada divide-y divide-slate-100">
        {membros.map((m) => (
          <LinhaMembro
            key={m.user_id}
            membro={m}
            eu={m.user_id === userId}
            podeGerenciar={podeGerenciar}
            aoGerarSenha={setCredenciais}
          />
        ))}
      </ul>

      {podeGerenciar && <NovoUsuario aoCriar={setCredenciais} />}

      {!podeGerenciar && (
        <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:px-5">
          Só o proprietário ou um gestor pode adicionar pessoas e alterar acessos.
        </p>
      )}

      <JanelaCredenciais
        credenciais={credenciais}
        urlSistema={urlSistema}
        aoFechar={() => setCredenciais(null)}
      />
    </Secao>
  );
}

function LinhaMembro({
  membro: m,
  eu,
  podeGerenciar,
  aoGerarSenha,
}: {
  membro: Membro;
  eu: boolean;
  podeGerenciar: boolean;
  aoGerarSenha: (c: Extract<Credenciais, { ok: true }>) => void;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const editavel = podeGerenciar && !eu && m.papel !== "proprietario";

  function trocarPapel(papel: PapelMembro) {
    setErro(null);
    iniciar(async () => {
      const r = await alterarPapel(m.user_id, papel);
      if (!r.ok) setErro(r.erro);
      router.refresh();
    });
  }

  function novaSenha() {
    setErro(null);
    iniciar(async () => {
      const r = await redefinirSenha(m.user_id);
      if (r.ok) aoGerarSenha(r);
      else setErro(r.erro);
    });
  }

  return (
    <li className="px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-semibold text-slate-700">
          {iniciais(m.nome ?? m.email)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">
            {m.nome ?? m.email ?? "Usuário"}
            {eu && <span className="ml-1.5 text-xs font-normal text-slate-400">(você)</span>}
          </p>
          <p className="truncate text-xs text-slate-500">
            {m.email}
            {m.cargo ? ` · ${m.cargo}` : ""} · desde {dataBR(m.created_at)}
          </p>
        </div>

        {editavel ? (
          <div className="flex items-center gap-1">
            <select
              value={m.papel}
              onChange={(e) => trocarPapel(e.target.value as PapelMembro)}
              disabled={ocupado}
              className="campo h-8 w-auto py-0 text-xs"
              aria-label={`Papel de ${m.nome ?? m.email}`}
            >
              {CONVIDAVEIS.map((p) => (
                <option key={p} value={p}>
                  {PAPEIS[p].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={novaSenha}
              disabled={ocupado}
              title="Gerar nova senha"
              aria-label="Gerar nova senha"
              className="pressionavel rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              {ocupado ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            </button>
            <BotaoExcluir
              compacto
              acao={removerMembro.bind(null, m.user_id)}
              titulo="Remover acesso"
              mensagem={`${m.nome ?? m.email} perderá o acesso aos dados desta empresa. Se o login foi criado aqui e a pessoa não participa de outra empresa, o login também é apagado.`}
            />
          </div>
        ) : (
          <Badge className={PAPEIS[m.papel].classe}>{PAPEIS[m.papel].label}</Badge>
        )}
      </div>
      {erro && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erro}</p>}
    </li>
  );
}

function NovoUsuario({ aoCriar }: { aoCriar: (c: Extract<Credenciais, { ok: true }>) => void }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [papel, setPapel] = useState<PapelMembro>("tecnico");
  const [enviando, iniciar] = useTransition();

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await criarUsuario(fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      (document.getElementById("form-novo-usuario") as HTMLFormElement | null)?.reset();
      aoCriar(r);
      router.refresh();
    });
  }

  return (
    <form id="form-novo-usuario" action={enviar} className="border-t border-slate-200 bg-slate-50/70">
      <div className="space-y-4 px-4 py-5 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <UserPlus className="h-4 w-4 text-slate-400" />
          Criar acesso para uma pessoa
        </div>
        <p className="-mt-2 text-xs text-slate-500">
          O login já nasce dentro desta empresa. No final aparecem o e-mail e a senha para você
          copiar ou mandar no WhatsApp. Se o e-mail já tiver conta, a pessoa só é adicionada à equipe.
        </p>

        {erro && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nome" obrigatorio>
            <input name="nome" required placeholder="Nome da pessoa" className="campo" />
          </Campo>
          <Campo label="E-mail (login)" obrigatorio>
            <input name="email" type="email" required placeholder="pessoa@empresa.com.br" className="campo" />
          </Campo>
          <Campo label="Senha" hint="Deixe em branco para gerar uma senha automática.">
            <input
              name="senha"
              type="text"
              minLength={6}
              autoComplete="new-password"
              placeholder="Gerar automaticamente"
              className="campo"
            />
          </Campo>
          <Campo label="Papel">
            <input type="hidden" name="papel" value={papel} />
            <div className="grid grid-cols-3 gap-1.5">
              {CONVIDAVEIS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPapel(p)}
                  className={cn(
                    "pressionavel rounded-lg border px-2 py-2 text-xs font-medium transition-all",
                    papel === p
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
                  )}
                >
                  {PAPEIS[p].label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">{PAPEIS[papel].descricao}.</p>
          </Campo>
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-200 px-4 py-3 sm:px-5">
        <Botao type="submit" disabled={enviando}>
          {enviando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Criar acesso
        </Botao>
      </div>
    </form>
  );
}

function JanelaCredenciais({
  credenciais,
  urlSistema,
  aoFechar,
}: {
  credenciais: Extract<Credenciais, { ok: true }> | null;
  urlSistema: string;
  aoFechar: () => void;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  if (!credenciais) return null;

  const url = urlSistema || (typeof window !== "undefined" ? window.location.origin : "");
  const mensagem = [
    `Olá${credenciais.nome ? `, ${credenciais.nome.split(" ")[0]}` : ""}! Seu acesso ao sistema de manutenção:`,
    "",
    `Endereço: ${url}/login`,
    `E-mail: ${credenciais.email}`,
    ...(credenciais.senha ? [`Senha: ${credenciais.senha}`, "", "Troque a senha em Configurações depois do primeiro acesso."] : []),
  ].join("\n");

  async function copiar(chave: string, valor: string) {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setCopiado(null);
    }
  }

  return (
    <Modal aberto aoFechar={aoFechar} titulo="Acesso pronto" largura="max-w-md">
      <div className="space-y-4 px-5 py-5">
        {credenciais.aviso ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">{credenciais.aviso}</p>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            Anote ou envie agora: por segurança, a senha não é mostrada de novo.
          </p>
        )}

        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          <LinhaCredencial rotulo="Endereço" valor={`${url}/login`} copiado={copiado === "url"} aoCopiar={() => copiar("url", `${url}/login`)} />
          <LinhaCredencial rotulo="E-mail" valor={credenciais.email} copiado={copiado === "email"} aoCopiar={() => copiar("email", credenciais.email)} />
          {credenciais.senha && (
            <LinhaCredencial
              rotulo="Senha"
              valor={credenciais.senha}
              destaque
              copiado={copiado === "senha"}
              aoCopiar={() => copiar("senha", credenciais.senha!)}
            />
          )}
        </div>
      </div>

      <RodapeModal>
        <Botao variante="secundario" onClick={() => copiar("tudo", mensagem)}>
          {copiado === "tudo" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiado === "tudo" ? "Copiado" : "Copiar tudo"}
        </Botao>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pressionavel inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" />
          Enviar no WhatsApp
        </a>
      </RodapeModal>
    </Modal>
  );
}

function LinhaCredencial({
  rotulo,
  valor,
  destaque,
  copiado,
  aoCopiar,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  copiado: boolean;
  aoCopiar: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
        <p className={cn("truncate text-sm text-slate-900", destaque && "font-mono text-base font-semibold tracking-wide")}>
          {valor}
        </p>
      </div>
      <button
        type="button"
        onClick={aoCopiar}
        className="pressionavel shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label={`Copiar ${rotulo.toLowerCase()}`}
      >
        {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
