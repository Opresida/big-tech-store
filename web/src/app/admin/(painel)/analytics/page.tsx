"use client";

import { useMemo, useState } from "react";
import { TituloPagina } from "@/components/admin/Navegacao";
import { Kpi } from "@/components/viz/Kpi";
import { GraficoBarras } from "@/components/viz/GraficoBarras";
import { GraficoLinha } from "@/components/viz/GraficoLinha";
import { Cartao, VerDados } from "@/components/viz/base";
import { moeda, moedaCompacta, numero, percentual } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import {
  agora,
  noPeriodo,
  periodoAnterior,
  ranking,
  receitaPorCategoria,
  resumo,
  serieDiaria,
  variacao,
} from "@/lib/metricas";

const JANELAS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

export default function PaginaAnalytics() {
  const { deposito, produtos } = useLoja();
  const [janela, setJanela] = useState(30);

  const dados = useMemo(() => {
    const ref = agora(deposito);
    const atuais = noPeriodo(deposito.pedidos, janela, ref);
    const anteriores = periodoAnterior(deposito.pedidos, janela, ref);
    const rank = ranking(atuais, produtos);
    const rankAnterior = ranking(anteriores, produtos);
    return {
      atuais,
      r: resumo(atuais),
      rAnterior: resumo(anteriores),
      rank,
      rankAnterior,
      serie: serieDiaria(atuais, janela, ref),
      categorias: receitaPorCategoria(atuais, produtos),
    };
  }, [deposito, produtos, janela]);

  const { r, rAnterior, rank, rankAnterior } = dados;
  const top5 = rank.slice(0, 5);
  const totalUnidades = rank.reduce((s, l) => s + l.unidades, 0);
  const totalCategorias = dados.categorias.reduce((s, c) => s + c.valor, 0);

  const posicaoAnterior = (produtoId: string) => {
    const i = rankAnterior.findIndex((l) => l.produtoId === produtoId);
    return i === -1 ? null : i + 1;
  };

  return (
    <div className="flex flex-col gap-6">
      <TituloPagina
        titulo="Analytics"
        descricao="Ranking de mais vendidos, curva de receita e desempenho por categoria."
        acao={
          <div className="flex gap-1.5">
            {JANELAS.map((j) => (
              <button
                key={j.dias}
                type="button"
                onClick={() => setJanela(j.dias)}
                aria-pressed={janela === j.dias}
                className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                  janela === j.dias
                    ? "bg-azul text-white"
                    : "bg-white text-cinza-600 hover:bg-cinza-100"
                }`}
              >
                {j.rotulo}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="Unidades vendidas"
          valor={numero(r.itens)}
          variacaoPercentual={variacao(r.itens, rAnterior.itens)}
          apoio="vs. período anterior"
        />
        <Kpi
          rotulo="Receita"
          valor={moeda(r.receita)}
          variacaoPercentual={variacao(r.receita, rAnterior.receita)}
        />
        <Kpi
          rotulo="Pedidos"
          valor={numero(r.pedidos)}
          variacaoPercentual={variacao(r.pedidos, rAnterior.pedidos)}
        />
        <Kpi
          rotulo="Itens por pedido"
          valor={(r.pedidos ? r.itens / r.pedidos : 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          apoio="média do período"
        />
      </div>

      {/* TOP 5 — o ranking pedido */}
      <Cartao
        titulo="Top 5 produtos mais vendidos"
        descricao={`Por unidades, nos últimos ${janela} dias. A seta mostra a mudança de posição em relação ao período anterior.`}
      >
        <ol className="flex flex-col gap-3">
          {top5.map((linha, i) => {
            const antes = posicaoAnterior(linha.produtoId);
            const delta = antes === null ? null : antes - (i + 1);
            const share = totalUnidades
              ? (linha.unidades / totalUnidades) * 100
              : 0;
            const maximo = top5[0]?.unidades || 1;

            return (
              <li
                key={linha.produtoId}
                className={`flex flex-col gap-3 rounded-xl border p-4 ${
                  i === 0 ? "border-azul bg-azul-claro" : "border-cinza-200"
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg font-mono text-[16px] font-bold ${
                      i === 0 ? "bg-azul text-white" : "bg-cinza-100 text-noite"
                    }`}
                  >
                    {i + 1}
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[15px] font-bold leading-[1.3] text-noite">
                      {linha.nome}
                    </span>
                    <span className="font-mono text-[11px] text-cinza-500">
                      SKU {linha.sku} · {linha.categoria}
                    </span>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-[20px] font-extrabold tabular-nums text-noite">
                      {numero(linha.unidades)}
                      <span className="ml-1 text-[12px] font-medium text-cinza-500">
                        un.
                      </span>
                    </span>
                    {delta !== null && delta !== 0 ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold ${
                          delta > 0
                            ? "bg-verde-claro text-verde-texto"
                            : "bg-vermelho-claro text-vermelho-texto"
                        }`}
                      >
                        <span aria-hidden="true">{delta > 0 ? "▲" : "▼"}</span>
                        {Math.abs(delta)}{" "}
                        {Math.abs(delta) === 1 ? "posição" : "posições"}
                      </span>
                    ) : (
                      <span className="rounded-md bg-cinza-100 px-1.5 py-1 text-[11px] font-bold text-cinza-600">
                        {delta === 0 ? "manteve" : "novo no top"}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="h-2.5 overflow-hidden rounded-l-[1px] rounded-r-[4px] bg-white"
                  role="meter"
                  aria-valuenow={linha.unidades}
                  aria-valuemin={0}
                  aria-valuemax={maximo}
                  aria-label={`Unidades vendidas de ${linha.nome}`}
                >
                  <div
                    className="h-full rounded-l-[1px] rounded-r-[4px] bg-azul"
                    style={{ width: `${(linha.unidades / maximo) * 100}%` }}
                  />
                </div>

                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { r: "Receita", v: moeda(linha.receita) },
                    { r: "Margem", v: moeda(linha.margem) },
                    {
                      r: "Margem %",
                      v: percentual(
                        linha.receita ? (linha.margem / linha.receita) * 100 : 0,
                      ),
                    },
                    { r: "Share de unidades", v: percentual(share) },
                  ].map((m) => (
                    <div key={m.r} className="flex flex-col gap-0.5">
                      <dt className="text-[11px] text-cinza-500">{m.r}</dt>
                      <dd className="font-mono text-[13px] font-bold tabular-nums text-noite">
                        {m.v}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            );
          })}
        </ol>

        <VerDados
          rotulo="Ver ranking completo em tabela"
          colunas={["#", "Produto", "Unidades", "Receita", "Margem"]}
          linhas={rank.map((l, i) => [
            i + 1,
            l.nome,
            l.unidades,
            moeda(l.receita),
            moeda(l.margem),
          ])}
        />
      </Cartao>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Cartao
          titulo="Curva de receita"
          descricao={`Receita diária dos últimos ${janela} dias.`}
        >
          <GraficoLinha
            dados={dados.serie}
            formatar={moedaCompacta}
            formatarSecundario={(v) => numero(v)}
            rotuloSecundario="pedidos"
          />
          <VerDados
            colunas={["Dia", "Receita", "Pedidos"]}
            linhas={dados.serie.map((p) => [
              p.rotulo,
              moeda(p.valor),
              p.secundario ?? 0,
            ])}
          />
        </Cartao>

        <Cartao
          titulo="Receita por categoria"
          descricao="Onde o faturamento se concentra no período."
        >
          <GraficoBarras
            itens={dados.categorias.map((c) => ({
              chave: c.nome,
              rotulo: c.nome,
              valor: c.valor,
              detalhe: percentual(
                totalCategorias ? (c.valor / totalCategorias) * 100 : 0,
                0,
              ),
            }))}
            formatar={moeda}
          />
        </Cartao>
      </div>

      <Cartao
        titulo="Desempenho de todos os produtos"
        descricao="Ordenado por unidades vendidas no período."
      >
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[700px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-cinza-200">
                {["#", "Produto", "Categoria", "Unidades", "Receita", "Margem", "Margem %"].map(
                  (c, i) => (
                    <th
                      key={c}
                      scope="col"
                      className={`px-2 py-2 font-semibold text-cinza-500 ${
                        i >= 3 ? "text-right" : "text-left"
                      }`}
                    >
                      {c}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rank.map((l, i) => (
                <tr key={l.produtoId} className="border-b border-cinza-200 last:border-0">
                  <td className="px-2 py-2.5 font-mono text-cinza-500">{i + 1}</td>
                  <td className="px-2 py-2.5 font-semibold text-noite">{l.nome}</td>
                  <td className="px-2 py-2.5 text-cinza-600">{l.categoria}</td>
                  <td className="px-2 py-2.5 text-right font-mono font-bold tabular-nums text-noite">
                    {numero(l.unidades)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums text-cinza-600">
                    {moeda(l.receita)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums text-cinza-600">
                    {moeda(l.margem)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono tabular-nums text-verde-texto">
                    {percentual(l.receita ? (l.margem / l.receita) * 100 : 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>
    </div>
  );
}
