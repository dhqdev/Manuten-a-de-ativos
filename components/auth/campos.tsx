"use client";

import { useState, type ComponentProps, type FormEvent } from "react";
import { Eye, EyeOff, Lock, type LucideIcon } from "lucide-react";
import { cn } from "@/components/ui";

/**
 * Envia o formulário pela action SEM limpar os campos. O React 19 reseta o
 * <form action> depois de cada envio — com erro de senha, a pessoa perdia o
 * e-mail digitado e tinha que preencher tudo de novo.
 */
export function enviarSemLimpar(acao: (dados: FormData) => void, iniciar: (f: () => void) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    iniciar(() => acao(dados));
  };
}

export function CampoIcone({
  Icone,
  className,
  ...props
}: { Icone: LucideIcon } & ComponentProps<"input">) {
  return (
    <div className="group relative">
      <Icone className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
      <input {...props} className={cn("campo h-12 pl-11", className)} />
    </div>
  );
}

export function CampoSenha({ className, ...props }: ComponentProps<"input">) {
  const [ver, setVer] = useState(false);

  return (
    <div className="group relative">
      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-900" />
      <input
        {...props}
        type={ver ? "text" : "password"}
        className={cn("campo h-12 pl-11 pr-12", className)}
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-slate-400 transition-colors hover:text-slate-700"
        aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
      >
        {ver ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

/** Barrinha de força da senha: só orienta, quem valida é o servidor. */
export function ForcaSenha({ senha }: { senha: string }) {
  if (!senha) return null;

  let pontos = 0;
  if (senha.length >= 6) pontos++;
  if (senha.length >= 10) pontos++;
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontos++;
  if (/\d/.test(senha) && /[^A-Za-z0-9]/.test(senha)) pontos++;

  const nivel =
    senha.length < 6
      ? { rotulo: "Muito curta", cor: "bg-red-500", texto: "text-red-600", n: 1 }
      : pontos <= 1
        ? { rotulo: "Fraca", cor: "bg-amber-500", texto: "text-amber-600", n: 2 }
        : pontos <= 2
          ? { rotulo: "Boa", cor: "bg-emerald-500", texto: "text-emerald-600", n: 3 }
          : { rotulo: "Forte", cor: "bg-emerald-500", texto: "text-emerald-600", n: 4 };

  return (
    <div className="mt-2 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn("h-1 flex-1 rounded-full transition-colors", i <= nivel.n ? nivel.cor : "bg-slate-200")}
          />
        ))}
      </div>
      <span className={cn("text-xs font-medium", nivel.texto)}>{nivel.rotulo}</span>
    </div>
  );
}
