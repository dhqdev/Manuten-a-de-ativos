import Link from "next/link";
import { MolduraAuth } from "@/components/auth/moldura";
import { FormLogin } from "./form";
import { caminhoInterno } from "@/lib/url-segura";

export const metadata = { title: "Entrar · Gestão de Manutenção" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; erro?: string; conta?: string }>;
}) {
  const { redirect: bruto, erro, conta } = await searchParams;

  // Nunca deixa um destino externo chegar sequer ao formulário.
  const destino = caminhoInterno(bruto);

  return (
    <MolduraAuth
      titulo="Bem-vindo de volta"
      subtitulo="Entre para acompanhar a manutenção dos seus ativos."
      aviso={
        conta === "excluida"
          ? "Sua conta foi excluída. Todos os dados vinculados a ela foram removidos."
          : undefined
      }
      rodape={
        <>
          Não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-medium text-slate-900 underline-offset-4 hover:underline"
          >
            Criar conta grátis
          </Link>
        </>
      }
    >
      <FormLogin
        destino={destino}
        avisoInicial={erro === "link_invalido" ? "Link inválido ou expirado. Tente novamente." : undefined}
      />
    </MolduraAuth>
  );
}
