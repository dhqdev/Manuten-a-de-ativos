import { Bloco, CabecalhoEsqueleto } from "@/components/esqueleto";

export default function Carregando() {
  return (
    <>
      <Bloco className="mb-4 h-4 w-40" />
      <CabecalhoEsqueleto />

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-superficie p-4">
        <Bloco className="h-11 w-11 rounded-xl" />
        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Bloco className="h-3 w-16" />
              <Bloco className="mt-2 h-5 w-10" />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Bloco className="h-10 flex-1" />
        <Bloco className="h-10 sm:w-52" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Bloco className="h-4 w-44" />
            <Bloco className="mt-2 h-3 w-32" />
            <Bloco className="mt-3 h-3 w-56" />
          </div>
        ))}
      </div>
    </>
  );
}
