import Link from "next/link";
import { MolduraAuth } from "@/components/auth/moldura";
import { FormLogin } from "./form";

export const metadata = { title: "Entrar · Gestão de Manutenção" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; erro?: string }>;
}) {
  const { redirect: destino, erro } = await searchParams;

  return (
    <MolduraAuth
      titulo="Entrar"
      subtitulo="Acesse o painel de manutenção da sua empresa."
      rodape={
        <>
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-marca-600 hover:text-marca-700">
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
