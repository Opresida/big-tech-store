"use client";

import { useState } from "react";
import { EIXO, GRADE, SERIE_1, escalaBonita, useLargura } from "./base";

export type PontoLinha = { rotulo: string; valor: number; secundario?: number };

/**
 * Série temporal de uma medida só — linha de 2px, área discreta,
 * ponto final destacado e crosshair no hover. Largura acompanha o container.
 */
export function GraficoLinha({
  dados,
  altura = 220,
  formatar,
  formatarSecundario,
  rotuloSecundario,
}: {
  dados: PontoLinha[];
  altura?: number;
  formatar: (v: number) => string;
  formatarSecundario?: (v: number) => string;
  rotuloSecundario?: string;
}) {
  const { ref, largura } = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);

  const margem = { topo: 12, direita: 12, baixo: 26, esquerda: 56 };
  const larguraPlot = Math.max(40, largura - margem.esquerda - margem.direita);
  const alturaPlot = altura - margem.topo - margem.baixo;

  const maximo = Math.max(...dados.map((d) => d.valor), 1);
  const { max: escalaMax, passo } = escalaBonita(maximo);

  const x = (i: number) =>
    margem.esquerda +
    (dados.length <= 1 ? larguraPlot / 2 : (i / (dados.length - 1)) * larguraPlot);
  const y = (v: number) => margem.topo + alturaPlot - (v / escalaMax) * alturaPlot;

  const linha = dados.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.valor)}`).join(" ");
  const area = `${linha} L${x(dados.length - 1)},${margem.topo + alturaPlot} L${x(0)},${
    margem.topo + alturaPlot
  } Z`;

  const ticks = Array.from({ length: escalaMax / passo + 1 }, (_, i) => i * passo);
  // Em telas estreitas, só uma fração dos rótulos do eixo X cabe.
  const espacoPorRotulo = 46;
  const salto = Math.max(1, Math.ceil((dados.length * espacoPorRotulo) / larguraPlot));

  function aoMover(e: React.MouseEvent<SVGSVGElement>) {
    const caixa = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - caixa.left - margem.esquerda;
    const i = Math.round((px / larguraPlot) * (dados.length - 1));
    setAtivo(Math.min(dados.length - 1, Math.max(0, i)));
  }

  const ponto = ativo !== null ? dados[ativo] : null;
  const ultimo = dados.length - 1;

  return (
    <div ref={ref} className="relative w-full">
      <svg
        width={largura}
        height={altura}
        role="img"
        aria-label={`Série temporal com ${dados.length} pontos, de ${dados[0]?.rotulo} a ${dados[ultimo]?.rotulo}`}
        onMouseMove={aoMover}
        onMouseLeave={() => setAtivo(null)}
        className="block touch-none"
      >
        {/* Grade — hairline sólida, um tom acima da superfície */}
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={margem.esquerda}
              x2={margem.esquerda + larguraPlot}
              y1={y(t)}
              y2={y(t)}
              stroke={GRADE}
              strokeWidth="1"
            />
            <text
              x={margem.esquerda - 8}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill={EIXO}
              className="font-mono tabular-nums"
            >
              {formatar(t)}
            </text>
          </g>
        ))}

        <path d={area} fill={SERIE_1} opacity="0.08" />
        <path
          d={linha}
          fill="none"
          stroke={SERIE_1}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Ponto final rotulado — o valor não fica refém do tooltip */}
        <circle
          cx={x(ultimo)}
          cy={y(dados[ultimo]?.valor ?? 0)}
          r="4.5"
          fill={SERIE_1}
          stroke="#fff"
          strokeWidth="2"
        />

        {/* Rótulos do eixo X — o último sempre aparece; um rótulo periódico
            perto demais dele é suprimido para não colidir. */}
        {dados.map((d, i) =>
          i === ultimo || (i % salto === 0 && ultimo - i >= salto * 0.7) ? (
            <text
              key={i}
              x={x(i)}
              y={altura - 8}
              textAnchor={i === 0 ? "start" : i === ultimo ? "end" : "middle"}
              fontSize="11"
              fill={EIXO}
              className="font-mono"
            >
              {d.rotulo}
            </text>
          ) : null,
        )}

        {/* Crosshair */}
        {ativo !== null && (
          <g>
            <line
              x1={x(ativo)}
              x2={x(ativo)}
              y1={margem.topo}
              y2={margem.topo + alturaPlot}
              stroke={SERIE_1}
              strokeWidth="1"
              opacity="0.4"
            />
            <circle
              cx={x(ativo)}
              cy={y(dados[ativo].valor)}
              r="5"
              fill={SERIE_1}
              stroke="#fff"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {ponto && ativo !== null && (
        <div
          className="pointer-events-none absolute z-10 flex min-w-36 flex-col gap-0.5 rounded-lg border border-cinza-200 bg-white px-3 py-2 shadow-[0_8px_24px_rgba(8,19,58,.14)]"
          style={{
            left: Math.min(Math.max(x(ativo) - 70, 0), Math.max(0, largura - 150)),
            top: 4,
          }}
          role="status"
        >
          <span className="font-mono text-[11px] text-cinza-500">
            {ponto.rotulo}
          </span>
          <span className="font-mono text-[15px] font-bold tabular-nums text-noite">
            {formatar(ponto.valor)}
          </span>
          {ponto.secundario !== undefined && rotuloSecundario && (
            <span className="text-[11px] text-cinza-500">
              {formatarSecundario
                ? formatarSecundario(ponto.secundario)
                : ponto.secundario}{" "}
              {rotuloSecundario}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
