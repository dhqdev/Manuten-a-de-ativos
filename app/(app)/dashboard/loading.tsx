import { Bloco, CabecalhoEsqueleto, CartoesEsqueleto, ListaEsqueleto, PainelEsqueleto } from "@/components/esqueleto";

export default function Carregando() {
  return (
    <>
      <CabecalhoEsqueleto />
      <CartoesEsqueleto />

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <PainelEsqueleto>
          <div className="flex h-64 items-end gap-3 px-5 pb-6 pt-8">
            {[45, 70, 35, 85, 55, 65].map((altura, i) => (
              <Bloco key={i} className="flex-1" style={{ height: `${altura}%` }} />
            ))}
          </div>
        </PainelEsqueleto>

        <PainelEsqueleto>
          <div className="space-y-4 px-5 py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <div className="mb-2 flex justify-between">
                  <Bloco className="h-3.5 w-32" />
                  <Bloco className="h-3.5 w-20" />
                </div>
                <Bloco className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </PainelEsqueleto>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <PainelEsqueleto>
          <ListaEsqueleto linhas={5} />
        </PainelEsqueleto>
        <PainelEsqueleto>
          <ListaEsqueleto linhas={5} />
        </PainelEsqueleto>
      </div>
    </>
  );
}
