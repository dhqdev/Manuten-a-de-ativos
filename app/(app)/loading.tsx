import { CabecalhoEsqueleto, CartoesEsqueleto, ListaEsqueleto, PainelEsqueleto } from "@/components/esqueleto";

export default function Carregando() {
  return (
    <>
      <CabecalhoEsqueleto />
      <CartoesEsqueleto />
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <PainelEsqueleto>
          <ListaEsqueleto />
        </PainelEsqueleto>
        <PainelEsqueleto>
          <ListaEsqueleto />
        </PainelEsqueleto>
      </div>
    </>
  );
}
