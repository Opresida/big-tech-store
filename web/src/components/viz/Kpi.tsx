"use client";

import { percentual } from "@/lib/formato";

/**
 * Stat tile. Quando a história é um número só, a resposta certa não é gráfico.
 * Figura em proporcional (nunca tabular-nums em número grande e isolado).
 */
export function Kpi({
  rotulo,
  valor,
  variacaoPercentual,
  apoio,
  tom = "neutro",
  invertido = false,
}: {
  rotulo: string;
  valor: string;
  variacaoPercentual?: number;
  apoio?: string;
  tom?: "neutro" | "positivo" | "atencao" | "critico";
  /** Para métricas em que subir é ruim (custo, ruptura). */
  invertido?: boolean;
}) {
  const cores = {
    neutro: "border-cinza-200",
    positivo: "border-l-4 border-l-verde border-cinza-200",
    atencao: "border-l-4 border-l-amarelo border-cinza-200",
    critico: "border-l-4 border-l-vermelho border-cinza-200",
  }[tom];

  const bom =
    variacaoPercentual === undefined
      ? null
      : invertido
        ? variacaoPercentual <= 0
        : variacaoPercentual >= 0;

  return (
    // No celular os tiles ficam 2 por linha: padding e corpo menores para o
    // valor caber sem quebrar. `break-words` é a rede de segurança para um
    // número maior que o previsto.
    <div
      className={`flex min-w-0 flex-col gap-2 rounded-xl border bg-white p-3 sm:p-4 ${cores}`}
    >
      <span className="t-label text-[10px] text-cinza-500">{rotulo}</span>
      <span className="break-words text-[18px] font-extrabold leading-none text-noite sm:text-[26px] lg:text-[30px]">
        {valor}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {variacaoPercentual !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold ${
              bom
                ? "bg-verde-claro text-verde-texto"
                : "bg-vermelho-claro text-vermelho-texto"
            }`}
          >
            <span aria-hidden="true">{variacaoPercentual >= 0 ? "▲" : "▼"}</span>
            {percentual(Math.abs(variacaoPercentual))}
          </span>
        )}
        {apoio && (
          <span className="text-[11px] leading-[1.35] text-cinza-500">
            {apoio}
          </span>
        )}
      </div>
    </div>
  );
}
