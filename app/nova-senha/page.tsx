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
