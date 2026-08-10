import { Bloco, CabecalhoEsqueleto } from "@/components/esqueleto";

export default function Carregando() {
  return (
    <>
      <CabecalhoEsqueleto comAcoes={false} />

      <div className="card mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Bloco className="h-9 w-9" />
          <Bloco className="h-9 w-9" />
          <Bloco className="h-9 w-20" />
          <Bloco className="ml-2 h-5 w-40" />
        </div>
        <div className="flex gap-2">
          <Bloco className="h-10 w-52" />
          <Bloco className="h-8 w-28 rounded-full" />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Bloco className="h-3 w-28" />
            <Bloco className="mt-2 h-6 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex justify-center px-1 py-2.5">
                <Bloco className="h-3 w-8" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-20 border-b border-r border-slate-100 p-2 sm:min-h-28">
                <Bloco className="h-6 w-6 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <Bloco className="h-4 w-32" />
          <Bloco className="mt-2 h-3 w-24" />
          <div className="mt-4 space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Bloco key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
