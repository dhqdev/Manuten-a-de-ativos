import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Manutenção · Gestão de ativos",
    short_name: "Manutenção",
    description:
      "Controle de ativos, manutenções, custos e preventivas — com alertas no WhatsApp.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icones/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Registrar manutenção",
        short_name: "Manutenções",
        url: "/manutencoes",
        icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }],
      },
      {
        name: "Calendário",
        short_name: "Calendário",
        url: "/calendario",
        icons: [{ src: "/icones/icone-192.png", sizes: "192x192" }],
      },
    ],
  };
}
