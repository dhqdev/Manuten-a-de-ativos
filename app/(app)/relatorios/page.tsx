import { GeradorRelatorio } from "@/components/relatorios/gerador";
import { Cabecalho } from "@/components/ui";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Relatórios · Gestão de Manutenção" };

export default async function RelatoriosPage() {
  const { orgId, organizacao } = await getContexto();
  const supabase = await createClient();

  const [{ data: categorias }, { data: ativos }] = await Promise.all([
    supabase.from("categorias").select("id, nome").eq("org_id", orgId).order("ordem").order("nome"),
    supabase.from("ativos").select("id, nome, categoria_id").eq("org_id", orgId).order("nome"),
  ]);

  return (
    <>
      <Cabecalho
        titulo="Relatórios"
        descricao="Filtre por período, categoria, ativo e tipo. Gere o PDF ou envie direto pelo WhatsApp."
      />
      <GeradorRelatorio
        empresa={organizacao.nome}
        orgId={orgId}
        categorias={categorias ?? []}
        ativos={ativos ?? []}
      />
    </>
  );
}
