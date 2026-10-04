import { CabecalhoEsqueleto, CartoesEsqueleto, ListaEsqueleto } from "@/components/esqueleto";

export default function Carregando() {
  return (
    <>
      <CabecalhoEsqueleto />
      <div className="mb-6">
        <CartoesEsqueleto quantidade={4} />
      </div>
      <div className="card">
        <ListaEsqueleto linhas={6} />
      </div>
    </>
  );
}
