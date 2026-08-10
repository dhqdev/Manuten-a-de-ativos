import { Bloco, CabecalhoEsqueleto, CartoesEsqueleto } from "@/components/esqueleto";

export default function Carregando() {
  return (
    <>
      <Bloco className="mb-4 h-4 w-36" />
      <CabecalhoEsqueleto />
      <CartoesEsqueleto />

      <div className="mb-5 mt-6 flex gap-4 border-b border-slate-200 pb-3">
        <Bloco className="h-5 w-48" />
        <Bloco className="h-5 w-44" />
        <Bloco className="h-5 w-32" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card flex items-start gap-3 p-4">
            <Bloco className="h-14 w-14 shrink-0 rounded-lg" />
            <div className="flex-1">
              <Bloco className="h-5 w-24 rounded-full" />
              <Bloco className="mt-2 h-4 w-2/3" />
              <Bloco className="mt-2 h-3 w-1/2" />
            </div>
            <Bloco className="h-5 w-24" />
          </div>
        ))}
      </div>
    </>
  );
}
