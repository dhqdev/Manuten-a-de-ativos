import { Bloco, CabecalhoEsqueleto } from "@/components/esqueleto";

export default function Carregando() {
  return (
    <>
      <CabecalhoEsqueleto />

      <div className="mb-5 flex gap-4 border-b border-slate-200 pb-3">
        <Bloco className="h-5 w-44" />
        <Bloco className="h-5 w-36" />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Bloco className="h-10 flex-1" />
        <Bloco className="h-10 sm:w-56" />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card border-l-4 border-l-slate-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Bloco className="h-5 w-28 rounded-full" />
                <Bloco className="mt-2 h-4 w-48" />
                <Bloco className="mt-2 h-3 w-36" />
              </div>
              <Bloco className="h-8 w-24" />
            </div>
            <Bloco className="mt-4 h-16 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}
