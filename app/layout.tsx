import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { FaiscaClique } from "@/components/efeitos/faisca-clique";
import { RegistrarServiceWorker } from "@/components/registrar-sw";
import { COOKIE_TEMA, COR_BARRA, classeTema, lerTema } from "@/lib/tema";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--fonte-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Manutenção · Gestão de ativos",
    template: "%s · Manutenção",
  },
  description:
    "Controle completo de ativos, manutenções, custos, históricos e manutenções preventivas.",
  applicationName: "Manutenção",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Manutenção",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export async function generateViewport(): Promise<Viewport> {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);

  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    // Ocupa a tela inteira no app instalado; o padding de safe-area cuida do resto.
    viewportFit: "cover",
    themeColor:
      tema === "sistema"
        ? [
            { media: "(prefers-color-scheme: light)", color: COR_BARRA.claro },
            { media: "(prefers-color-scheme: dark)", color: COR_BARRA.escuro },
          ]
        : COR_BARRA[tema],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);

  return (
    // Extensões como o Dark Reader carimbam atributos no <html> antes do React
    // hidratar, o que virava erro de hidratação em dev. Vale só para este
    // elemento: divergência real dentro do app continua sendo reportada.
    <html
      lang="pt-BR"
      className={`${inter.variable} ${classeTema(tema)}`.trim()}
      suppressHydrationWarning
    >
      <body className="font-sans">
        {children}
        <RegistrarServiceWorker />
        <FaiscaClique />
      </body>
    </html>
  );
}
