"use client";

import { useMemo, useState } from "react";
import { TituloPagina } from "@/components/admin/Navegacao";
import { Kpi } from "@/components/viz/Kpi";
import { GraficoColunas } from "@/components/viz/GraficoColunas";
import { GraficoBarras } from "@/components/viz/GraficoBarras";
import { GraficoLinha } from "@/components/viz/GraficoLinha";
import { Cartao, VerDados } from "@/components/viz/base";
import { dataLonga, moeda, moedaCompacta, numero, percentual } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import {
  agora,
  noPeriodo,
  periodoAnterior,
  porFormaPagamento,
  resumo,
  serieDiaria,
  serieMensal,
  valorEstoque,
  variacao,
} from "@/lib/metricas";

const JANELAS = [
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

export default function PaginaFinanceiro() {
  const { deposito, produtos } = useLoja();
  const [janela, setJanela] = useState(30);

  const dados = useMemo(() => {
    const ref = agora(deposito);
    const atuais = noPeriodo(deposito.pedidos, janela, ref);
    const anteriores = periodoAnterior(deposito.pedidos, janela, ref);
    return {
      ref,
      r: resumo(atuais),
      rAnterior: resumo(anteriores),
      serie: serieDiaria(atuais, janela, ref),
      // O histórico mockado cobre 90 dias — mais meses que isso sairiam zerados.
      mensal: serieMensal(deposito.pedidos, 4, ref),
      pagamentos: porFormaPagamento(atuais),
    };
  }, [deposito, janela]);

  const { r, rAnterior } = dados;

  // Contas a pagar: ordens de compra ainda não recebidas.
  const aPagar = deposito.compras.filter((c) => c.status !== "recebida");
  const totalAPagar = aPagar.reduce((s, c) => s + c.total, 0);
  const totalPagamentos = dados.pagamentos.reduce((s, p) => s + p.valor, 0);

  return (
    <div className="flex flex-col gap-6">
      <TituloPagina
        titulo="Financeiro"
        descricao="Receita, custo da mercadoria vendida e margem. Toda venda da loja entra aqui na hora."
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi
          rotulo={`Receita ${janela} dias`}
          valor={moeda(r.receita)}
          variacaoPercentual={variacao(r.receita, rAnterior.receita)}
          apoio="vs. período anterior"
        />
        <Kpi
          rotulo="Custo da mercadoria"
          valor={moeda(r.custo)}
          variacaoPercentual={variacao(r.custo, rAnterior.custo)}
          apoio="CMV do período"
          invertido
        />
        <Kpi
          rotulo="Margem bruta"
          valor={moeda(r.margem)}
          variacaoPercentual={variacao(r.margem, rAnterior.margem)}
          tom="positivo"
          apoio={percentual(r.margemPercentual)}
        />
        <Kpi
          rotulo="Ticket médio"
          valor={moeda(r.ticketMedio)}
          variacaoPercentual={variacao(r.ticketMedio, rAnterior.ticketMedio)}
          apoio={`${numero(r.pedidos)} pedidos`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Cartao
          titulo="Resultado por mês"
          descricao="Custo e margem empilhados formam a receita do mês. O mês corrente é parcial — vai até hoje."
        >
          <GraficoColunas
            itens={dados.mensal.map((m) => ({
              rotulo: m.rotulo,
              base: m.custo,
              topo: m.margem,
            }))}
            formatar={moedaCompacta}
            rotuloBase="Custo"
            rotuloTopo="Margem"
          />
          <VerDados
            colunas={["Mês", "Receita", "Custo", "Margem", "Pedidos"]}
            linhas={dados.mensal.map((m) => [
              m.rotulo,
              moeda(m.receita),
              moeda(m.custo),
              moeda(m.margem),
              m.pedidos,
            ])}
          />
        </Cartao>

        <Cartao
          titulo="Receita por dia"
          descricao={`Últimos ${janela} dias.`}
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
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Cartao
          titulo="Recebimento por forma de pagamento"
          descricao="O Pix concentra o caixa imediato — e ainda sai 5% mais barato para o cliente."
        >
          <GraficoBarras
            itens={dados.pagamentos.map((p) => ({
              chave: p.nome,
              rotulo: p.nome,
              valor: p.valor,
              detalhe: `${numero(p.qtd)} pedidos · ${percentual(
                totalPagamentos ? (p.valor / totalPagamentos) * 100 : 0,
                0,
              )} do total`,
            }))}
            formatar={moeda}
          />
        </Cartao>

        <Cartao
          titulo="Contas a pagar"
          descricao="Ordens de compra emitidas e ainda não recebidas."
        >
          {aPagar.length === 0 ? (
            <p className="rounded-lg bg-verde-claro px-3 py-3 text-[13px] text-verde-texto">
              Nenhum compromisso em aberto com fornecedores.
            </p>
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-cinza-200">
                {aPagar.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-mono text-[13px] font-bold text-noite">
                        {c.id} · {c.fornecedor}
                      </span>
                      <span className="text-[12px] text-cinza-500">
                        vence com a entrega, prevista para {dataLonga(c.previsao)}
                      </span>
                    </div>
                    <span className="font-mono text-[14px] font-bold tabular-nums text-noite">
                      {moeda(c.total)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between border-t border-cinza-200 pt-3">
                <span className="text-[14px] font-bold text-noite">
                  Total a pagar
                </span>
                <span className="text-[20px] font-extrabold text-noite">
                  {moeda(totalAPagar)}
                </span>
              </div>
            </>
          )}
        </Cartao>
      </div>

      {/* DRE simplificado */}
      <Cartao
        titulo="Resumo do período"
        descricao={`Demonstrativo simplificado dos últimos ${janela} dias.`}
      >
        <dl className="flex flex-col divide-y divide-cinza-200">
          {[
            { rotulo: "Receita bruta", valor: r.receita, forte: false },
            { rotulo: "(−) Custo da mercadoria vendida", valor: -r.custo, forte: false },
            { rotulo: "(=) Margem bruta", valor: r.margem, forte: true },
          ].map((l) => (
            <div
              key={l.rotulo}
              className="flex flex-wrap items-baseline justify-between gap-2 py-3"
            >
              <dt
                className={`text-[14px] ${l.forte ? "font-bold text-noite" : "text-cinza-600"}`}
              >
                {l.rotulo}
              </dt>
              <dd
                className={`font-mono tabular-nums ${
                  l.forte
                    ? "text-[20px] font-extrabold text-noite"
                    : "text-[15px] text-noite"
                }`}
              >
                {moeda(Math.abs(l.valor))}
              </dd>
            </div>
          ))}
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <dt className="text-[14px] text-cinza-600">
              Margem sobre a receita
            </dt>
            <dd className="font-mono text-[15px] font-bold tabular-nums text-verde-texto">
              {percentual(r.margemPercentual)}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <dt className="text-[14px] text-cinza-600">
              Capital imobilizado em estoque (a custo)
            </dt>
            <dd className="font-mono text-[15px] tabular-nums text-noite">
              {moeda(valorEstoque(produtos))}
            </dd>
          </div>
        </dl>
      </Cartao>
    </div>
  );
}
