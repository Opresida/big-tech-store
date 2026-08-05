"use client";

import Link from "next/link";
import { useMemo } from "react";
import { TituloPagina } from "@/components/admin/Navegacao";
import { Kpi } from "@/components/viz/Kpi";
import { GraficoLinha } from "@/components/viz/GraficoLinha";
import { GraficoBarras } from "@/components/viz/GraficoBarras";
import { Cartao, VerDados } from "@/components/viz/base";
import { BadgeEstoque } from "@/components/Estoque";
import { nivelEstoque } from "@/lib/estoque";
import { dataHora, moeda, moedaCompacta, numero, percentual } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import {
  agora,
  noPeriodo,
  periodoAnterior,
  ranking,
  resumo,
  serieDiaria,
  valorEstoque,
  variacao,
} from "@/lib/metricas";

export default function VisaoGeral() {
  const { deposito, produtos } = useLoja();

  const dados = useMemo(() => {
    const ref = agora(deposito);
    const atuais = noPeriodo(deposito.pedidos, 30, ref);
    const anteriores = periodoAnterior(deposito.pedidos, 30, ref);
    return {
      ref,
      atuais,
      r: resumo(atuais),
      rAnterior: resumo(anteriores),
      serie: serieDiaria(atuais, 30, ref),
      top: ranking(atuais, produtos).slice(0, 5),
    };
  }, [deposito, produtos]);

  const alertas = produtos
    .filter((p) => nivelEstoque(p) !== "ok")
    .sort((a, b) => a.estoque / a.estoqueAlvo - b.estoque / b.estoqueAlvo);

  const comprasAbertas = deposito.compras.filter((c) => c.status !== "recebida");
  const ultimosPedidos = deposito.pedidos.slice(0, 6);

  const { r, rAnterior } = dados;

  return (
    <div className="flex flex-col gap-6">
      <TituloPagina
        titulo="Visão geral"
        descricao="Últimos 30 dias, comparados com os 30 anteriores. Os números vêm dos mesmos pedidos que a loja gera."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="Receita 30 dias"
          valor={moeda(r.receita)}
          variacaoPercentual={variacao(r.receita, rAnterior.receita)}
          apoio="vs. 30 dias anteriores"
        />
        <Kpi
          rotulo="Pedidos"
          valor={numero(r.pedidos)}
          variacaoPercentual={variacao(r.pedidos, rAnterior.pedidos)}
          apoio={`${numero(r.itens)} itens vendidos`}
        />
        <Kpi
          rotulo="Ticket médio"
          valor={moeda(r.ticketMedio)}
          variacaoPercentual={variacao(r.ticketMedio, rAnterior.ticketMedio)}
        />
        <Kpi
          rotulo="Margem bruta"
          valor={moeda(r.margem)}
          apoio={`${percentual(r.margemPercentual)} sobre a receita`}
          tom="positivo"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Cartao
          titulo="Receita por dia"
          descricao="Últimos 30 dias. Passe o mouse para ver o valor e o número de pedidos."
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
          titulo="Top 5 mais vendidos"
          descricao="Por unidades, nos últimos 30 dias."
          acao={
            <Link href="/admin/analytics" className="btn btn-outline btn-sm">
              Analytics
            </Link>
          }
        >
          <GraficoBarras
            posicao
            itens={dados.top.map((t) => ({
              chave: t.produtoId,
              rotulo: t.nome,
              valor: t.unidades,
              detalhe: `${moeda(t.receita)} em receita`,
            }))}
            formatar={(v) => `${numero(v)} un.`}
          />
        </Cartao>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Alertas de estoque */}
        <Cartao
          titulo="Precisa de reposição"
          descricao={`${alertas.length} SKUs abaixo de 40% do estoque-alvo.`}
          acao={
            <Link href="/admin/compras" className="btn btn-primary btn-sm">
              Abrir compras
            </Link>
          }
        >
          {alertas.length === 0 ? (
            <p className="rounded-lg bg-verde-claro px-3 py-3 text-[13px] text-verde-texto">
              Nenhum produto em alerta. Estoque saudável.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-cinza-200">
              {alertas.slice(0, 6).map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-semibold text-noite">
                      {p.nome}
                    </span>
                    <span className="font-mono text-[11px] text-cinza-500">
                      SKU {p.sku} · alvo {p.estoqueAlvo}
                    </span>
                  </div>
                  <BadgeEstoque produto={p} className="!px-2 !py-1 !text-[11px]" />
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {/* Compras em aberto */}
        <Cartao
          titulo="Compras em aberto"
          descricao="Ordens que ainda não deram entrada no estoque."
        >
          {comprasAbertas.length === 0 ? (
            <p className="rounded-lg bg-cinza-50 px-3 py-3 text-[13px] text-cinza-600">
              Nenhuma ordem pendente.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-cinza-200">
              {comprasAbertas.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-mono text-[13px] font-bold text-noite">
                      {c.id}
                    </span>
                    <span className="truncate text-[12px] text-cinza-500">
                      {c.fornecedor} ·{" "}
                      {c.itens.reduce((s, i) => s + i.quantidade, 0)} un.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] tabular-nums text-cinza-600">
                      {moeda(c.total)}
                    </span>
                    <span
                      className={`badge !px-2 !py-1 !text-[11px] ${
                        c.status === "enviada" ? "badge-baixo" : "badge-ok"
                      }`}
                    >
                      {c.status === "enviada" ? "Enviada" : "Rascunho"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      </div>

      {/* Últimos pedidos */}
      <Cartao
        titulo="Últimos pedidos"
        descricao="Inclui os pedidos que você fizer pela loja nesta demonstração."
        acao={
          <Link href="/admin/vendas" className="btn btn-outline btn-sm">
            Ver vendas
          </Link>
        }
      >
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-cinza-200">
                {["Pedido", "Cliente", "Itens", "Pagamento", "Data", "Total"].map(
                  (c, i) => (
                    <th
                      key={c}
                      scope="col"
                      className={`px-2 py-2 font-semibold text-cinza-500 ${
                        i >= 4 ? "text-right" : "text-left"
                      }`}
                    >
                      {c}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {ultimosPedidos.map((p) => (
                <tr key={p.id} className="border-b border-cinza-200 last:border-0">
                  <td className="px-2 py-2.5 font-mono font-bold text-noite">
                    {p.id}
                  </td>
                  <td className="px-2 py-2.5 text-noite">{p.cliente}</td>
                  <td className="px-2 py-2.5 text-cinza-600">
                    {p.itens.reduce((s, i) => s + i.quantidade, 0)}
                  </td>
                  <td className="px-2 py-2.5 capitalize text-cinza-600">
                    {p.pagamento}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-cinza-500">
                    {dataHora(p.data)}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono font-bold tabular-nums text-noite">
                    {moeda(p.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Cartao>

      <p className="text-[12px] leading-[1.5] text-cinza-500">
        Valor imobilizado em estoque a custo:{" "}
        <strong className="text-noite">{moeda(valorEstoque(produtos))}</strong> ·
        dados mockados, salvos apenas neste navegador.
      </p>
    </div>
  );
}
