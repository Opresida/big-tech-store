import { Estrelas } from "@/components/Estrelas";
import { distribuicaoNotas, type Depoimento } from "@/lib/depoimentos";
import { dataLonga, numero } from "@/lib/formato";

export function Depoimentos({
  depoimentos,
  nota,
  avaliacoes,
}: {
  depoimentos: Depoimento[];
  nota: number;
  avaliacoes: number;
}) {
  const distribuicao = distribuicaoNotas(nota, avaliacoes);

  return (
    <section className="flex flex-col gap-6" aria-labelledby="titulo-depoimentos">
      <div className="flex items-baseline gap-3">
        <h2
          id="titulo-depoimentos"
          className="text-[24px] font-bold text-noite sm:text-[28px]"
        >
          O que quem comprou está dizendo
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Resumo das notas */}
        <div className="flex h-fit flex-col gap-4 rounded-xl bg-cinza-50 p-5">
          <div className="flex flex-col gap-1.5">
            <span className="t-display text-[44px] text-noite">
              {nota.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
            </span>
            <Estrelas nota={nota} tamanho={16} />
            <span className="text-[13px] text-cinza-500">
              {numero(avaliacoes)} avaliações verificadas
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {distribuicao.map((d) => (
              <li key={d.estrelas} className="flex items-center gap-2.5">
                <span className="w-8 shrink-0 font-mono text-[12px] tabular-nums text-cinza-600">
                  {d.estrelas}★
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-cinza-200">
                  <span
                    className="block h-full rounded-full bg-amarelo"
                    style={{ width: `${d.percentual}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-right font-mono text-[12px] tabular-nums text-cinza-500">
                  {d.percentual}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Depoimentos */}
        <ul className="grid gap-4 sm:grid-cols-2">
          {depoimentos.map((d, i) => (
            <li
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-cinza-200 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-bold text-noite">
                    {d.nome}
                  </span>
                  <span className="text-[12px] text-cinza-500">{d.local}</span>
                </div>
                <Estrelas nota={d.nota} tamanho={13} />
              </div>

              <div className="flex flex-col gap-1.5">
                <strong className="text-[15px] font-semibold text-noite">
                  {d.titulo}
                </strong>
                <p className="text-[14px] leading-[1.55] text-cinza-600">
                  {d.texto}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                {d.compraVerificada && (
                  <span className="badge badge-ok !px-2 !py-1 !text-[11px]">
                    <span aria-hidden="true">✓</span> Compra verificada
                  </span>
                )}
                <span className="font-mono text-[11px] text-cinza-400">
                  {dataLonga(d.data)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
