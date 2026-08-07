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
