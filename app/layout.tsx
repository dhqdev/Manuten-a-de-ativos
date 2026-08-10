import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RegistrarServiceWorker } from "@/components/registrar-sw";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Ocupa a tela inteira no app instalado; o padding de safe-area cuida do resto.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        {children}
        <RegistrarServiceWorker />
      </body>
    </html>
  );
}
