/**
 * Identidade: uma porca sextavada (bolt/nut) — leitura imediata de manutenção
 * mecânica e legível até em 16px, no favicon.
 */
export function Simbolo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden focusable="false">
      <path
        d="M12 2.6 20.1 7.3v9.4L12 21.4 3.9 16.7V7.3z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

export function Logo({
  tamanho = "md",
  tom = "escuro",
}: {
  tamanho?: "sm" | "md";
  tom?: "escuro" | "claro";
}) {
  const caixa = tamanho === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icone = tamanho === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <span
      className={`flex ${caixa} shrink-0 items-center justify-center rounded-[10px] ${
        tom === "claro" ? "bg-white text-slate-900" : "bg-slate-900 text-white"
      }`}
    >
      <Simbolo className={icone} />
    </span>
  );
}

export function Assinatura({
  empresa,
  tom = "escuro",
}: {
  empresa?: string;
  tom?: "escuro" | "claro";
}) {
  const principal = tom === "claro" ? "text-white" : "text-slate-900";
  const secundario = tom === "claro" ? "text-slate-400" : "text-slate-500";

  return (
    <div className="min-w-0">
      <p className={`truncate text-[15px] font-semibold leading-tight tracking-tight ${principal}`}>
        Manutenção
      </p>
      <p className={`truncate text-xs leading-tight ${secundario}`}>{empresa ?? "Gestão de ativos"}</p>
    </div>
  );
}
