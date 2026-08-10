import { Navegacao } from "@/components/shell/navegacao";
import { getContexto } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Uma única chamada ao banco traz usuário, empresa e o total de alertas.
  const ctx = await getContexto();

  return (
    <Navegacao
      nomeUsuario={ctx.profile.nome ?? ctx.email}
      emailUsuario={ctx.email}
      nomeEmpresa={ctx.organizacao.nome}
      alertas={ctx.alertas}
    >
      {children}
    </Navegacao>
  );
}
