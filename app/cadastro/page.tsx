import Link from "next/link";
import { MolduraAuth } from "@/components/auth/moldura";
import { FormCadastro } from "./form";

export const metadata = { title: "Criar conta · Gestão de Manutenção" };

export default function CadastroPage() {
  return (
    <MolduraAuth
      titulo="Criar conta"
      subtitulo="Sua empresa já começa com as categorias padrão criadas."
      rodape={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-marca-600 hover:text-marca-700">
            Entrar
          </Link>
        </>
      }
    >
      <FormCadastro />
    </MolduraAuth>
  );
}

/**
 * Renderização dinâmica obrigatória: o nonce da CSP vem do cabeçalho da
 * requisição. Se esta página for pré-gerada no build, os scripts saem sem nonce
 * e o navegador bloqueia TODO o JavaScript dela.
 */
export const dynamic = "force-dynamic";
