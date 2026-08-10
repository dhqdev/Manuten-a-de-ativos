import Link from "next/link";
import { MolduraAuth } from "@/components/auth/moldura";
import { FormRecuperar } from "./form";

export const metadata = { title: "Recuperar senha · Gestão de Manutenção" };

export default function RecuperarSenhaPage() {
  return (
    <MolduraAuth
      titulo="Recuperar senha"
      subtitulo="Enviaremos um link para você criar uma nova senha."
      rodape={
        <Link href="/login" className="font-medium text-marca-600 hover:text-marca-700">
          Voltar para o login
        </Link>
      }
    >
      <FormRecuperar />
    </MolduraAuth>
  );
}

/**
 * Renderização dinâmica obrigatória: o nonce da CSP vem do cabeçalho da
 * requisição. Se esta página for pré-gerada no build, os scripts saem sem nonce
 * e o navegador bloqueia TODO o JavaScript dela.
 */
export const dynamic = "force-dynamic";
