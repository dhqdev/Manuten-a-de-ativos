import { Bloco, CabecalhoEsqueleto, PainelEsqueleto } from "@/components/esqueleto";

function FormularioEsqueleto({ campos = 4 }: { campos?: number }) {
  return (
    <>
      <div className="space-y-4 px-4 py-5 sm:px-5">
        {Array.from({ length: campos }).map((_, i) => (
          <div key={i}>
            <Bloco className="mb-2 h-3 w-28" />
            <Bloco className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-4 py-3.5 sm:px-5">
        <Bloco className="h-10 w-40" />
      </div>
    </>
  );
}

export default function Carregando() {
  return (
    <>
      <CabecalhoEsqueleto comAcoes={false} />
      <div className="grid gap-4 xl:grid-cols-2">
        <PainelEsqueleto>
          <FormularioEsqueleto />
        </PainelEsqueleto>
        <PainelEsqueleto>
          <FormularioEsqueleto />
        </PainelEsqueleto>
        <PainelEsqueleto>
          <FormularioEsqueleto campos={2} />
        </PainelEsqueleto>
        <PainelEsqueleto>
          <FormularioEsqueleto campos={3} />
        </PainelEsqueleto>
      </div>
    </>
  );
}
