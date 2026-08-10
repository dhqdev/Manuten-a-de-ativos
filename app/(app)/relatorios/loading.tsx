import { Bloco, CabecalhoEsqueleto, ListaEsqueleto, PainelEsqueleto } from "@/components/esqueleto";

export default function Carregando() {
  return (
    <>
      <CabecalhoEsqueleto comAcoes={false} />

      <div className="card mb-4 p-4 sm:p-5">
        <Bloco className="mb-4 h-4 w-40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <Bloco className="mb-2 h-3 w-24" />
              <Bloco className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bloco key={i} className="h-8 w-28 rounded-full" />
            ))}
          </div>
          <div className="flex gap-2">
            <Bloco className="h-10 w-32" />
            <Bloco className="h-10 w-32" />
            <Bloco className="h-10 w-32" />
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Bloco className="h-3 w-32" />
            <Bloco className="mt-2 h-6 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <PainelEsqueleto>
          <ListaEsqueleto linhas={4} />
        </PainelEsqueleto>
        <PainelEsqueleto>
          <ListaEsqueleto linhas={4} />
        </PainelEsqueleto>
      </div>
    </>
  );
}
