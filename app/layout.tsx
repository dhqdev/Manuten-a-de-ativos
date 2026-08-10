import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
