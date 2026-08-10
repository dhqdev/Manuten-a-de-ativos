import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Organizacao, PapelMembro, Profile } from "@/lib/types";

export type Contexto = {
  userId: string;
  email: string;
  profile: Profile;
  orgId: string;
  organizacao: Organizacao;
  papel: PapelMembro;
  /** Todas as empresas de que o usuário participa (para o seletor de empresa). */
  empresas: { id: string; nome: string }[];
  /** Manutenções vencendo ou atrasadas — mostrado no menu lateral. */
  alertas: number;
};

type RespostaContexto = {
  perfil: Profile | null;
  org_id: string;
  papel: PapelMembro;
  organizacao: Organizacao;
  empresas: { id: string; nome: string }[];
  alertas: number;
};

/**
 * Carrega usuário + empresa atual. Redireciona para /login se não houver sessão.
 *
 * Desempenho: o token é verificado localmente (getClaims usa as chaves públicas
 * do projeto, sem ida à rede) e todo o resto vem de UMA chamada ao banco. Antes
 * eram 5 consultas em sequência — com ~400 ms de latência cada, isso sozinho
 * segurava a tela por ~2 s a cada clique no menu.
 *
 * `cache` garante que layout e página compartilhem o mesmo resultado.
 */
export const getContexto = cache(async (): Promise<Contexto> => {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const email = (claims?.claims?.email as string | undefined) ?? "";

  if (!userId) redirect("/login");

  const { data, error } = await supabase.rpc("contexto_usuario");

  // Sem empresa: conta criada antes do SQL rodar. Monta o espaço de trabalho.
  if (!error && !data) {
    const { data: novaOrg, error: erroCriacao } = await supabase.rpc("criar_workspace", {
      p_nome: "Minha Empresa",
    });
    if (erroCriacao || !novaOrg) redirect("/erro-configuracao");

    const { data: segundaTentativa } = await supabase.rpc("contexto_usuario");
    if (!segundaTentativa) redirect("/erro-configuracao");
    return montar(segundaTentativa as RespostaContexto, userId, email);
  }

  // Banco ainda sem a função (migração de desempenho não rodada): usa o caminho
  // antigo, mais lento, em vez de derrubar o app.
  if (error) {
    if (funcaoAusente(error)) return caminhoAntigo(userId, email);
    redirect("/erro-configuracao");
  }

  if (!data) redirect("/erro-configuracao");

  return montar(data as RespostaContexto, userId, email);
});

function funcaoAusente(erro: { code?: string; message?: string }) {
  return (
    erro.code === "PGRST202" ||
    erro.code === "42883" ||
    /contexto_usuario/i.test(erro.message ?? "")
  );
}

/** Caminho antigo (5 consultas). Só roda se `contexto_usuario()` não existir. */
async function caminhoAntigo(userId: string, email: string): Promise<Contexto> {
  console.warn(
    "[gestao-manutencao] Função contexto_usuario() ausente no banco. " +
      "Rode supabase/migracao-desempenho.sql para acelerar a navegação.",
  );

  const supabase = await createClient();

  const [{ data: profile }, { data: membros }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("org_membros")
      .select("org_id, papel")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const membro = membros?.find((m) => m.org_id === profile?.org_atual) ?? membros?.[0] ?? null;
  if (!membro) redirect("/erro-configuracao");

  const ids = (membros ?? []).map((m) => m.org_id);

  const [{ data: organizacao }, { data: todas }, { count }] = await Promise.all([
    supabase.from("organizacoes").select("*").eq("id", membro.org_id).maybeSingle(),
    supabase.from("organizacoes").select("id, nome").in("id", ids).order("nome"),
    supabase
      .from("vw_planos_status")
      .select("id", { count: "exact", head: true })
      .eq("org_id", membro.org_id)
      .in("situacao", ["proxima", "atrasada"]),
  ]);

  if (!organizacao) redirect("/erro-configuracao");

  return montar(
    {
      perfil: (profile ?? null) as Profile | null,
      org_id: membro.org_id,
      papel: membro.papel as PapelMembro,
      organizacao: organizacao as Organizacao,
      empresas: todas ?? [],
      alertas: count ?? 0,
    },
    userId,
    email,
  );
}

function montar(dados: RespostaContexto, userId: string, email: string): Contexto {
  return {
    userId,
    email: dados.perfil?.email ?? email,
    profile:
      dados.perfil ??
      ({
        id: userId,
        nome: null,
        email,
        telefone: null,
        cargo: null,
        avatar_url: null,
        org_atual: dados.org_id,
      } as Profile),
    orgId: dados.org_id,
    organizacao: dados.organizacao,
    papel: dados.papel,
    empresas: dados.empresas ?? [],
    alertas: Number(dados.alertas ?? 0),
  };
}
