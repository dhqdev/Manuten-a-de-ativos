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
};

/**
 * Carrega usuário + empresa atual. Redireciona para /login se não houver sessão.
 * `cache` evita repetir as queries quando vários componentes da mesma página chamam.
 */
export const getContexto = cache(async (): Promise<Contexto> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  const { data: membros } = await supabase
    .from("org_membros")
    .select("org_id, papel")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // org_atual só vale se o usuário ainda for membro dela (pode ter sido removido).
  const daOrgAtual = membros?.find((m) => m.org_id === profile?.org_atual);
  const membro = daOrgAtual ?? membros?.[0] ?? null;

  let orgId: string | null = membro?.org_id ?? null;

  // Usuário criado antes do SQL rodar: monta a empresa na hora.
  if (!orgId) {
    const { data: novaOrg, error } = await supabase.rpc("criar_workspace", {
      p_nome: (user.user_metadata?.empresa as string) || "Minha Empresa",
    });
    if (error || !novaOrg) redirect("/erro-configuracao");
    orgId = novaOrg as string;
  }

  const { data: organizacao } = await supabase
    .from("organizacoes")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (!organizacao) redirect("/erro-configuracao");

  const ids = (membros ?? []).map((m) => m.org_id);
  const { data: todas } = ids.length
    ? await supabase.from("organizacoes").select("id, nome").in("id", ids).order("nome")
    : { data: [] as { id: string; nome: string }[] };

  return {
    empresas: todas ?? [{ id: orgId, nome: (organizacao as Organizacao).nome }],
    userId: user.id,
    email: user.email ?? "",
    profile: (profile ?? {
      id: user.id,
      nome: (user.user_metadata?.nome as string) ?? null,
      email: user.email ?? null,
      telefone: null,
      cargo: null,
      avatar_url: null,
      org_atual: orgId,
    }) as Profile,
    orgId,
    organizacao: organizacao as Organizacao,
    papel: (membro?.papel as PapelMembro) ?? "proprietario",
  };
});
