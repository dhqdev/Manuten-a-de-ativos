import { Bloco, CabecalhoEsqueleto } from "@/components/esqueleto";

export default function Carregando() {
  return (
    <>
      <CabecalhoEsqueleto />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start gap-3">
              <Bloco className="h-11 w-11 rounded-xl" />
              <div className="flex-1">
                <Bloco className="h-4 w-32" />
                <Bloco className="mt-2 h-3 w-full" />
              </div>
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4">
              <div>
                <Bloco className="h-4 w-20" />
                <Bloco className="mt-2 h-3 w-28" />
              </div>
              <Bloco className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
