import { Navegacao } from "@/components/shell/navegacao";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContexto();
  const supabase = await createClient();

  const { count } = await supabase
    .from("vw_planos_status")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.orgId)
    .in("situacao", ["proxima", "atrasada"]);

  return (
    <Navegacao
      nomeUsuario={ctx.profile.nome ?? ctx.email}
      emailUsuario={ctx.email}
      nomeEmpresa={ctx.organizacao.nome}
      alertas={count ?? 0}
    >
      {children}
    </Navegacao>
  );
}
