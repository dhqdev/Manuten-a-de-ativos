import Link from "next/link";
import { Building2, FolderOpen, ShieldCheck } from "lucide-react";
import { PainelEquipe } from "@/components/configuracoes/equipe";
import { FormularioSalvar } from "@/components/configuracoes/formulario-salvar";
import { PainelWhatsapp, type ConexaoAtual } from "@/components/configuracoes/whatsapp";
import { ZonaPerigo } from "@/components/configuracoes/zona-perigo";
import { Cabecalho, Campo, Secao } from "@/components/ui";
import { alterarSenha, salvarEmpresa, salvarPerfil, trocarEmpresa } from "@/lib/actions/configuracoes";
import { dataBR } from "@/lib/format";
import { podeGerenciar } from "@/lib/permissoes";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { PapelMembro } from "@/lib/types";

export const metadata = { title: "Configurações · Gestão de Manutenção" };

export default async function ConfiguracoesPage() {
  const { orgId, userId, email, profile, organizacao, papel, empresas } = await getContexto();
  const supabase = await createClient();

  const [
    { data: membros },
    { data: categorias },
    { count: totalAtivos },
    { count: totalManutencoes },
    { data: conexaoWhatsapp },
  ] = await Promise.all([
    supabase
      .from("org_membros")
      .select("user_id, papel, created_at, profiles(nome, email, cargo)")
      .eq("org_id", orgId)
      .order("created_at"),
    supabase.from("categorias").select("id, nome, cor").eq("org_id", orgId).order("ordem").order("nome"),
    supabase.from("ativos").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("manutencoes").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase
      .from("whatsapp_conexoes")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle(),
  ]);

  const gestor = podeGerenciar(papel);

  // Para a exclusão de conta: empresas onde o usuário é a única pessoa somem
  // por completo; nas demais ele apenas sai.
  const { data: todosMembros } = await supabase
    .from("org_membros")
    .select("org_id")
    .in("org_id", empresas.map((e) => e.id));

  const pessoasPorEmpresa = new Map<string, number>();
  for (const m of todosMembros ?? []) {
    pessoasPorEmpresa.set(m.org_id, (pessoasPorEmpresa.get(m.org_id) ?? 0) + 1);
  }

  const empresasApagadas = empresas
    .filter((e) => (pessoasPorEmpresa.get(e.id) ?? 1) <= 1)
    .map((e) => e.nome);
  const empresasMantidas = empresas
    .filter((e) => (pessoasPorEmpresa.get(e.id) ?? 1) > 1)
    .map((e) => e.nome);

  type LinhaMembro = {
    user_id: string;
    papel: PapelMembro;
    created_at: string;
    profiles: { nome: string | null; email: string | null; cargo: string | null } | null;
  };

  const equipe = (membros ?? []) as unknown as LinhaMembro[];

  return (
    <>
      <Cabecalho titulo="Configurações" descricao="Dados da empresa, seu perfil, equipe e segurança." />

      {empresas.length > 1 && (
        <div className="mb-4">
          <Secao titulo="Empresa ativa">
            <FormularioSalvar acao={trocarEmpresa} rotulo="Trocar empresa" mensagemSucesso="Empresa alterada.">
              <Campo
                label="Você participa de mais de uma empresa"
                hint="Todo o sistema passa a mostrar os dados da empresa escolhida."
              >
                <select name="org_id" defaultValue={orgId} className="campo">
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome}
                    </option>
                  ))}
                </select>
              </Campo>
            </FormularioSalvar>
          </Secao>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Empresa */}
        <Secao titulo="Dados da empresa">
          <FormularioSalvar acao={salvarEmpresa} mensagemSucesso="Empresa atualizada.">
            <Campo label="Nome da empresa" obrigatorio>
              <input name="nome" required defaultValue={organizacao.nome} className="campo" />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="CNPJ">
                <input name="cnpj" defaultValue={organizacao.cnpj ?? ""} placeholder="00.000.000/0001-00" className="campo" />
              </Campo>
              <Campo label="Telefone">
                <input name="telefone" defaultValue={organizacao.telefone ?? ""} placeholder="(11) 3333-3333" className="campo" />
              </Campo>
            </div>
            <Campo label="Endereço">
              <input name="endereco" defaultValue={organizacao.endereco ?? ""} placeholder="Rua, número, cidade/UF" className="campo" />
            </Campo>
            <p className="text-xs text-slate-500">
              O nome da empresa aparece no cabeçalho dos relatórios em PDF.
            </p>
          </FormularioSalvar>
        </Secao>

        {/* Perfil */}
        <Secao titulo="Meu perfil">
          <FormularioSalvar acao={salvarPerfil} mensagemSucesso="Perfil atualizado.">
            <Campo label="Nome" obrigatorio>
              <input name="nome" required defaultValue={profile.nome ?? ""} className="campo" />
            </Campo>
            <Campo label="E-mail" hint="O e-mail de acesso não pode ser alterado por aqui.">
              <input value={email} disabled className="campo" />
            </Campo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Telefone">
                <input name="telefone" defaultValue={profile.telefone ?? ""} placeholder="(11) 99999-9999" className="campo" />
              </Campo>
              <Campo label="Cargo">
                <input name="cargo" defaultValue={profile.cargo ?? ""} placeholder="Ex.: Encarregado de manutenção" className="campo" />
              </Campo>
            </div>
          </FormularioSalvar>
        </Secao>

        {/* Segurança */}
        <Secao titulo="Alterar senha">
          <FormularioSalvar
            acao={alterarSenha}
            rotulo="Alterar senha"
            mensagemSucesso="Senha alterada."
            limparAoSalvar
          >
            <Campo label="Nova senha" obrigatorio hint="Mínimo 6 caracteres.">
              <input name="senha" type="password" required minLength={6} autoComplete="new-password" placeholder="••••••••" className="campo" />
            </Campo>
            <Campo label="Confirmar nova senha" obrigatorio>
              <input name="confirmacao" type="password" required minLength={6} autoComplete="new-password" placeholder="••••••••" className="campo" />
            </Campo>
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3.5 py-3 text-xs text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              Sua sessão continua ativa após a troca. Use uma senha que você não usa em outros sistemas.
            </div>
          </FormularioSalvar>
        </Secao>

        {/* Resumo do sistema */}
        <Secao titulo="Resumo do sistema">
          <div className="grid grid-cols-2 gap-4 px-4 py-5 sm:px-5">
            <Info rotulo="Ativos cadastrados" valor={String(totalAtivos ?? 0)} />
            <Info rotulo="Manutenções registradas" valor={String(totalManutencoes ?? 0)} />
            <Info rotulo="Categorias" valor={String(categorias?.length ?? 0)} />
            <Info rotulo="Empresa criada em" valor={dataBR(organizacao.created_at)} />
          </div>

          <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <FolderOpen className="h-4 w-4 text-slate-400" />
                Categorias de ativos
              </p>
              <Link href="/ativos" className="text-sm font-medium text-marca-600 hover:text-marca-700">
                Gerenciar
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {(categorias ?? []).map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.cor }} aria-hidden />
                  {c.nome}
                </span>
              ))}
              {(categorias?.length ?? 0) === 0 && (
                <span className="text-sm text-slate-500">Nenhuma categoria cadastrada.</span>
              )}
            </div>
          </div>
        </Secao>
      </div>

      {/* WhatsApp */}
      <div className="mt-4">
        {gestor ? (
          <PainelWhatsapp conexao={(conexaoWhatsapp as ConexaoAtual) ?? null} />
        ) : (
          <Secao titulo="Notificações por WhatsApp">
            <p className="px-4 py-5 text-sm text-slate-600 sm:px-5">
              {conexaoWhatsapp?.status === "conectado"
                ? "O resumo diário está ativo para esta empresa."
                : "O WhatsApp ainda não foi conectado."}{" "}
              Só o proprietário ou um gestor pode alterar esta configuração.
            </p>
          </Secao>
        )}
      </div>

      {/* Equipe */}
      <div className="mt-4">
        <PainelEquipe
          membros={equipe.map((m) => ({
            user_id: m.user_id,
            papel: m.papel,
            created_at: m.created_at,
            nome: m.profiles?.nome ?? null,
            email: m.profiles?.email ?? null,
            cargo: m.profiles?.cargo ?? null,
          }))}
          userId={userId}
          podeGerenciar={gestor}
          urlSistema={(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "")}
        />
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>
          Todos os dados são isolados por empresa no banco. Cada pessoa só enxerga os ativos e
          manutenções das empresas de que faz parte.
        </p>
      </div>

      <div className="mt-4">
        <ZonaPerigo
          email={email}
          empresasQueSeraoApagadas={empresasApagadas}
          empresasQueSeraoTransferidas={empresasMantidas}
        />
      </div>
    </>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{valor}</p>
    </div>
  );
}
