"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Paleta de dados — derivada do brandbook, validada em
 * scripts/validate_palette.js (banda de luminosidade, piso de croma,
 * separação para daltonismo e contraste na superfície branca).
 *
 * O laranja #FF6A00 fica FORA das séries de propósito: é cor exclusiva de CTA
 * (Brandbook 03). Verde/amarelo/vermelho só aparecem como status, sempre com
 * rótulo em texto junto — nunca como "série 4".
 */
export const SERIE_1 = "#0B37D6"; // medida principal
export const SERIE_2 = "#7FA0F0"; // segunda faixa da composição (rotulada)
export const GRADE = "#E3E7EF";
export const EIXO = "#7A839A";
export const TINTA = "#08133A";

/** Largura real do container — é o que torna o SVG responsivo de verdade. */
export function useLargura<T extends HTMLElement>(inicial = 640) {
  const ref = useRef<T>(null);
  const [largura, setLargura] = useState(inicial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([entrada]) => {
      const w = entrada.contentRect.width;
      if (w > 0) setLargura(w);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, largura };
}

/** Passo de escala "redondo" para os ticks do eixo. */
export function escalaBonita(max: number, divisoes = 4) {
  if (max <= 0) return { max: 1, passo: 1 };
  const bruto = max / divisoes;
  const magnitude = 10 ** Math.floor(Math.log10(bruto));
  const normalizado = bruto / magnitude;
  const passo =
    (normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 5 ? 5 : 10) *
    magnitude;
  return { max: passo * divisoes, passo };
}

export function Legenda({
  itens,
}: {
  itens: { cor: string; rotulo: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {itens.map((i) => (
        <li key={i.rotulo} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: i.cor }}
            aria-hidden="true"
          />
          <span className="text-[12px] text-cinza-600">{i.rotulo}</span>
        </li>
      ))}
    </ul>
  );
}

/** Toda visualização precisa ter os valores acessíveis fora do gráfico. */
export function VerDados({
  colunas,
  linhas,
  rotulo = "Ver dados em tabela",
}: {
  colunas: string[];
  linhas: (string | number)[][];
  rotulo?: string;
}) {
  return (
    <details className="mt-3 group">
      <summary className="cursor-pointer list-none text-[12px] font-semibold text-azul hover:underline">
        <span className="group-open:hidden">▸ {rotulo}</span>
        <span className="hidden group-open:inline">▾ Ocultar tabela</span>
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-cinza-200">
        <table className="w-full border-collapse text-[12px]">
          <thead className="sticky top-0 bg-cinza-50">
            <tr>
              {colunas.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={`whitespace-nowrap px-3 py-2 font-semibold text-cinza-600 ${
                    i === 0 ? "text-left" : "text-right"
                  }`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => (
              <tr key={i} className="border-t border-cinza-200">
                {linha.map((celula, j) => (
                  <td
                    key={j}
                    className={`whitespace-nowrap px-3 py-2 ${
                      j === 0
                        ? "text-left text-noite"
                        : "text-right font-mono tabular-nums text-cinza-600"
                    }`}
                  >
                    {celula}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function Cartao({
  titulo,
  descricao,
  acao,
  children,
  className = "",
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`cartao flex flex-col gap-4 p-4 sm:p-5 ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-bold text-noite">{titulo}</h2>
          {descricao && (
            <p className="text-[12px] leading-[1.45] text-cinza-500">
              {descricao}
            </p>
          )}
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}
