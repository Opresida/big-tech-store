"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TituloPagina } from "@/components/admin/Navegacao";
import { BarraEstoque } from "@/components/Estoque";
import { Kpi } from "@/components/viz/Kpi";
import { GraficoBarras } from "@/components/viz/GraficoBarras";
import { Cartao, VerDados } from "@/components/viz/base";
import { CLASSE_BADGE, ROTULO_NIVEL, nivelEstoque } from "@/lib/estoque";
import { dataHora, moeda, numero } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import { agora, cobertura, noPeriodo, ranking, resumo } from "@/lib/metricas";

type Aba = "ruptura" | "pedidos";

export default function PaginaVendas() {
  const { deposito, produtos } = useLoja();
  const [aba, setAba] = useState<Aba>("ruptura");

  const dados = useMemo(() => {
    const ref = agora(deposito);
    const atuais = noPeriodo(deposito.pedidos, 30, ref);
    return {
      ref,
      atuais,
      r: resumo(atuais),
      giro: cobertura(produtos, deposito.pedidos, ref),
      top: ranking(atuais, produtos).slice(0, 5),
    };
  }, [deposito, produtos]);

  // O que o time de vendas precisa ver acabando.
  const emRisco = dados.giro.filter(
    (c) => c.produto.estoque === 0 || c.diasCobertura < 21,
  );
  const esgotados = produtos.filter((p) => p.estoque === 0);
  const perdaPotencial = esgotados.reduce(
    (s, p) => s + p.preco * Math.max(1, Math.round(p.estoqueAlvo * 0.1)),
    0,
  );

  return (
    <div className="flex flex-col gap-6">
      <TituloPagina
        titulo="Área de vendas"
        descricao="O que está acabando antes de esgotar, e o que já esgotou. Cobertura = estoque ÷ média de venda diária dos últimos 30 dias."
        acao={
          <Link href="/admin/compras" className="btn btn-cta btn-sm">
            Repor estoque
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="SKUs em risco de ruptura"
          valor={numero(emRisco.length)}
          tom={emRisco.length ? "atencao" : "positivo"}
          apoio="menos de 21 dias de cobertura"
        />
        <Kpi
          rotulo="SKUs esgotados"
          valor={numero(esgotados.length)}
          tom={esgotados.length ? "critico" : "positivo"}
          apoio="venda parada agora"
          invertido
        />
        <Kpi
          rotulo="Receita 30 dias"
          valor={moeda(dados.r.receita)}
          apoio={`${numero(dados.r.pedidos)} pedidos`}
        />
        <Kpi
          rotulo="Receita parada"
          valor={moeda(perdaPotencial)}
          tom="atencao"
          apoio="estimativa do que os esgotados venderiam"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Cartao
          titulo="Risco de ruptura"
          descricao="Ordenado pelo que acaba primeiro. Cobertura em vermelho vence em menos de 7 dias."
        >
          {emRisco.length === 0 ? (
            <p className="rounded-lg bg-verde-claro px-3 py-3 text-[13px] text-verde-texto">
              Nenhum SKU com menos de 21 dias de cobertura.
            </p>
          ) : (
            <>
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[720px] border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-cinza-200">
                      <th scope="col" className="px-2 py-2 text-left font-semibold text-cinza-500">
                        Produto
                      </th>
                      <th scope="col" className="px-2 py-2 text-left font-semibold text-cinza-500">
                        Status
                      </th>
                      <th scope="col" className="w-40 px-2 py-2 text-left font-semibold text-cinza-500">
                        Nível
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold text-cinza-500">
                        Vendidos 30d
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold text-cinza-500">
                        Média/dia
                      </th>
                      <th scope="col" className="px-2 py-2 text-right font-semibold text-cinza-500">
                        Acaba em
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {emRisco.map((c) => {
                      const nivel = nivelEstoque(c.produto);
                      const dias = c.diasCobertura;
                      return (
                        <tr
                          key={c.produto.id}
                          className="border-b border-cinza-200 last:border-0"
                        >
                          <td className="px-2 py-3">
                            <div className="flex flex-col gap-0.5">
                              <Link
                                href={`/produtos/${c.produto.slug}`}
                                className="font-semibold text-noite hover:text-azul"
                              >
                                {c.produto.nome}
                              </Link>
                              <span className="font-mono text-[11px] text-cinza-500">
                                SKU {c.produto.sku}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <span
                              className={`badge ${CLASSE_BADGE[nivel]} !px-2 !py-1 !text-[11px]`}
                            >
                              <span aria-hidden="true">●</span>
                              {ROTULO_NIVEL[nivel]}
                            </span>
                          </td>
                          <td className="px-2 py-3">
                            <BarraEstoque produto={c.produto} mostrarTexto={false} />
                            <span className="mt-1 block font-mono text-[11px] text-cinza-500">
                              {c.produto.estoque} un.
                            </span>
                          </td>
                          <td className="px-2 py-3 text-right font-mono tabular-nums text-noite">
                            {c.vendidos30}
                          </td>
                          <td className="px-2 py-3 text-right font-mono tabular-nums text-cinza-600">
                            {c.mediaDiaria.toFixed(1)}
                          </td>
                          <td className="px-2 py-3 text-right font-mono tabular-nums">
                            {c.produto.estoque === 0 ? (
                              <span className="font-bold text-vermelho-texto">
                                esgotado
                              </span>
                            ) : !Number.isFinite(dias) ? (
                              <span className="text-cinza-500">sem giro</span>
                            ) : (
                              <span
                                className={
                                  dias < 7
                                    ? "font-bold text-vermelho-texto"
                                    : "font-bold text-ambar"
                                }
                              >
                                {Math.floor(dias)} dias
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <VerDados
                colunas={["Produto", "Estoque", "Vendidos 30d", "Cobertura (dias)"]}
                linhas={emRisco.map((c) => [
                  c.produto.nome,
                  c.produto.estoque,
                  c.vendidos30,
                  Number.isFinite(c.diasCobertura)
                    ? Math.floor(c.diasCobertura)
                    : "—",
                ])}
              />
            </>
          )}
        </Cartao>

        <Cartao
          titulo="Puxando a receita"
          descricao="Top 5 por unidades nos últimos 30 dias."
        >
          <GraficoBarras
            posicao
            itens={dados.top.map((t) => ({
              chave: t.produtoId,
              rotulo: t.nome,
              valor: t.unidades,
              detalhe: `${moeda(t.receita)} · margem ${moeda(t.margem)}`,
            }))}
            formatar={(v) => `${numero(v)} un.`}
          />
        </Cartao>
      </div>

      {/* Pedidos */}
      <Cartao titulo="Movimento de vendas">
        <div className="flex gap-1.5">
          {(
            [
              { id: "ruptura", rotulo: "Todos os SKUs" },
              { id: "pedidos", rotulo: "Pedidos recentes" },
            ] as { id: Aba; rotulo: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              aria-pressed={aba === t.id}
              className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                aba === t.id
                  ? "bg-azul text-white"
                  : "bg-cinza-50 text-cinza-600 hover:bg-cinza-100"
              }`}
            >
              {t.rotulo}
            </button>
          ))}
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {aba === "ruptura" ? (
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-cinza-200">
                  {["Produto", "Estoque", "Vendidos 30d", "Média/dia", "Cobertura"].map(
                    (c, i) => (
                      <th
                        key={c}
                        scope="col"
                        className={`px-2 py-2 font-semibold text-cinza-500 ${
                          i === 0 ? "text-left" : "text-right"
                        }`}
                      >
                        {c}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {dados.giro.map((c) => (
                  <tr
                    key={c.produto.id}
                    className="border-b border-cinza-200 last:border-0"
                  >
                    <td className="px-2 py-2.5 text-noite">{c.produto.nome}</td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-noite">
                      {c.produto.estoque}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-cinza-600">
                      {c.vendidos30}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-cinza-600">
                      {c.mediaDiaria.toFixed(1)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-cinza-600">
                      {Number.isFinite(c.diasCobertura)
                        ? `${Math.floor(c.diasCobertura)} dias`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-cinza-200">
                  {["Pedido", "Cliente", "Canal", "Itens", "Data", "Total"].map(
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
                {deposito.pedidos.slice(0, 25).map((p) => (
                  <tr key={p.id} className="border-b border-cinza-200 last:border-0">
                    <td className="px-2 py-2.5 font-mono font-bold text-noite">
                      {p.id}
                    </td>
                    <td className="px-2 py-2.5 text-noite">{p.cliente}</td>
                    <td className="px-2 py-2.5 text-cinza-600">
                      {p.canal === "site" ? "Loja" : "Checkout direto"}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono tabular-nums text-cinza-600">
                      {p.itens.reduce((s, i) => s + i.quantidade, 0)}
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
          )}
        </div>
      </Cartao>
    </div>
  );
}
