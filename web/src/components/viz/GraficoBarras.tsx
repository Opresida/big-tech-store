"use client";

import { SERIE_1 } from "./base";

export type BarraItem = {
  chave: string;
  rotulo: string;
  valor: number;
  detalhe?: string;
  destaque?: boolean;
};

/**
 * Barras horizontais ranqueadas — uma medida, um tom só (a identidade está no
 * rótulo, não na cor). HTML puro: acompanha a largura do container e o texto
 * quebra sozinho no celular.
 *
 * Marcas: trilho ≤ 24px, ponta arredondada em 4px e quadrada na linha de base.
 */
export function GraficoBarras({
  itens,
  formatar,
  posicao = false,
}: {
  itens: BarraItem[];
  formatar: (v: number) => string;
  /** Numera as linhas — usado no Top 5. */
  posicao?: boolean;
}) {
  const maximo = Math.max(...itens.map((i) => i.valor), 1);

  return (
    <ol className="flex flex-col gap-3.5">
      {itens.map((item, i) => {
        const pct = (item.valor / maximo) * 100;
        return (
          <li key={item.chave} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-baseline gap-2">
                {posicao && (
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded font-mono text-[11px] font-bold ${
                      i === 0
                        ? "bg-azul text-white"
                        : "bg-cinza-100 text-cinza-600"
                    }`}
                  >
                    {i + 1}
                  </span>
                )}
                <span className="truncate text-[13px] font-semibold text-noite">
                  {item.rotulo}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-noite">
                {formatar(item.valor)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="h-2.5 flex-1 overflow-hidden rounded-l-[1px] rounded-r-[4px] bg-cinza-100"
                role="meter"
                aria-valuenow={item.valor}
                aria-valuemin={0}
                aria-valuemax={maximo}
                aria-label={item.rotulo}
              >
                <div
                  className="h-full rounded-l-[1px] rounded-r-[4px] transition-[width] duration-500"
                  style={{
                    width: `${Math.max(pct, 1.5)}%`,
                    background: SERIE_1,
                    opacity: item.destaque === false ? 0.4 : 1,
                  }}
                />
              </div>
            </div>

            {item.detalhe && (
              <span className="text-[11px] text-cinza-500">{item.detalhe}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
