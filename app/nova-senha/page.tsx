import { MolduraAuth } from "@/components/auth/moldura";
import { FormNovaSenha } from "./form";

export const metadata = { title: "Nova senha · Gestão de Manutenção" };

export default function NovaSenhaPage() {
  return (
    <MolduraAuth titulo="Definir nova senha" subtitulo="Escolha uma senha com no mínimo 6 caracteres.">
      <FormNovaSenha />
    </MolduraAuth>
  );
}

/**
 * Renderização dinâmica obrigatória: o nonce da CSP vem do cabeçalho da
 * requisição. Se esta página for pré-gerada no build, os scripts saem sem nonce
 * e o navegador bloqueia TODO o JavaScript dela.
 */
export const dynamic = "force-dynamic";
