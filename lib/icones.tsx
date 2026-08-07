import {
  Boxes,
  Cog,
  Container,
  Droplets,
  Forklift,
  Fuel,
  HardHat,
  Package,
  Plug,
  Snowflake,
  Truck,
  Warehouse,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const ICONES: Record<string, LucideIcon> = {
  truck: Truck,
  droplets: Droplets,
  cog: Cog,
  forklift: Forklift,
  wrench: Wrench,
  "hard-hat": HardHat,
  package: Package,
  boxes: Boxes,
  container: Container,
  fuel: Fuel,
  plug: Plug,
  snowflake: Snowflake,
  warehouse: Warehouse,
  zap: Zap,
};

export const OPCOES_ICONE = Object.keys(ICONES);

export function IconeCategoria({
  nome,
  className,
}: {
  nome: string | null | undefined;
  className?: string;
}) {
  const Icone = ICONES[nome ?? "package"] ?? Package;
  return <Icone className={className} />;
}

/**
 * As seis primeiras formam a paleta padrão — validada para daltonismo
 * (separação adjacente OK em gráficos de barra com rótulo direto).
 * As demais ficam disponíveis para escolha do usuário.
 */
export const CORES_CATEGORIA = [
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#ea580c",
  "#16a34a",
  "#db2777",
  "#0d9488",
  "#dc2626",
  "#a16207",
  "#475569",
];
