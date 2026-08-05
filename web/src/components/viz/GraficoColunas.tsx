"use client";

import { useState } from "react";
import { Legenda, SERIE_1, SERIE_2 } from "./base";

export type ColunaItem = {
  rotulo: string;
  base: number;
  topo: number;
  extra?: string;
};

/**
 * Composição empilhada — base + topo formam o total (ex.: custo + margem =
 * receita). Uma medida só, duas faixas do mesmo azul: não é gráfico de dois
 * eixos, é parte-do-todo.
 *
 * O passo mais claro fica abaixo de 3:1 de contraste, então as faixas vêm
 * sempre com legenda e rótulo direto no valor do período em foco.
 */
export function GraficoColunas({
  itens,
  formatar,
  rotuloBase,
  rotuloTopo,
  altura = 200,
}: {
  itens: ColunaItem[];
  formatar: (v: number) => string;
  rotuloBase: string;
  rotuloTopo: string;
  altura?: number;
}) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const maximo = Math.max(...itens.map((i) => i.base + i.topo), 1);
  const foco = ativo ?? itens.length - 1;
  const item = itens[foco];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Legenda
          itens={[
            { cor: SERIE_1, rotulo: rotuloTopo },
            { cor: SERIE_2, rotulo: rotuloBase },
          ]}
        />
        {item && (
          <div className="flex flex-col items-end gap-0.5" role="status">
            <span className="font-mono text-[11px] text-cinza-500">
              {item.rotulo}
              {ativo === null ? " (último)" : ""}
            </span>
            <span className="font-mono text-[13px] tabular-nums text-cinza-600">
              {rotuloTopo}{" "}
              <strong className="text-noite">{formatar(item.topo)}</strong> ·{" "}
              {rotuloBase} {formatar(item.base)}
            </span>
          </div>
        )}
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        {/* min-width baixo de propósito: com poucos períodos, todos precisam
            caber na tela do celular — inclusive o mês corrente, que é o que
            mais interessa. Só rola de lado quando a série é longa. */}
        <div
          className="flex min-w-[260px] items-end gap-2"
          style={{ height: altura }}
          onMouseLeave={() => setAtivo(null)}
        >
          {itens.map((it, i) => {
            const total = it.base + it.topo;
            const alturaTotal = (total / maximo) * (altura - 24);
            const alturaBase = total ? (it.base / total) * alturaTotal : 0;
            const alturaTopo = Math.max(0, alturaTotal - alturaBase - 2);
            const emFoco = foco === i;

            return (
              <button
                key={it.rotulo}
                type="button"
                className="group flex h-full min-w-0 flex-1 cursor-default flex-col justify-end gap-1.5"
                onMouseEnter={() => setAtivo(i)}
                onFocus={() => setAtivo(i)}
                aria-label={`${it.rotulo}: ${rotuloTopo} ${formatar(it.topo)}, ${rotuloBase} ${formatar(it.base)}`}
              >
                <span
                  className="flex w-full flex-col justify-end"
                  style={{ height: alturaTotal }}
                >
                  {/* topo — ponta arredondada em 4px */}
                  <span
                    className="mx-auto w-full max-w-6 rounded-t-[4px] transition-opacity"
                    style={{
                      height: alturaTopo,
                      background: SERIE_1,
                      opacity: emFoco ? 1 : 0.75,
                    }}
                  />
                  {/* 2px de superfície separando as faixas */}
                  <span className="h-0.5" />
                  {/* base — quadrada na linha de base */}
                  <span
                    className="mx-auto w-full max-w-6 transition-opacity"
                    style={{
                      height: alturaBase,
                      background: SERIE_2,
                      opacity: emFoco ? 1 : 0.75,
                    }}
                  />
                </span>
                <span
                  className={`truncate font-mono text-[10px] ${
                    emFoco ? "font-bold text-noite" : "text-cinza-500"
                  }`}
                >
                  {it.rotulo}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
