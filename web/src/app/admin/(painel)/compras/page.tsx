"use client";

import { useMemo, useState } from "react";
import { TituloPagina } from "@/components/admin/Navegacao";
import { Kpi } from "@/components/viz/Kpi";
import { Cartao } from "@/components/viz/base";
import { FORNECEDORES } from "@/lib/catalogo";
import { CLASSE_BADGE, ROTULO_NIVEL, nivelEstoque } from "@/lib/estoque";
import { dataLonga, moeda, numero } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import { agora, cobertura } from "@/lib/metricas";
import type { StatusCompra } from "@/lib/tipos";

const ESTILO_STATUS: Record<StatusCompra, string> = {
  rascunho: "badge-ok",
  enviada: "badge-baixo",
  recebida: "badge-ok",
};

const ROTULO_STATUS: Record<StatusCompra, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada ao fornecedor",
  recebida: "Recebida",
};

type Rascunho = { produtoId: string; quantidade: number };

export default function PaginaCompras() {
  const { deposito, produtos, criarCompra, enviarCompra, receberCompra } =
    useLoja();

  const [fornecedor, setFornecedor] = useState(FORNECEDORES[0]);
  const [previsao, setPrevisao] = useState("");
  const [itens, setItens] = useState<Rascunho[]>([]);
  const [aviso, setAviso] = useState("");

  const sugestoes = useMemo(() => {
    const ref = agora(deposito);
    return cobertura(produtos, deposito.pedidos, ref)
      .filter((c) => c.sugestaoCompra > 0 && nivelEstoque(c.produto) !== "ok")
      .slice(0, 8);
  }, [deposito, produtos]);

  const abertas = deposito.compras.filter((c) => c.status !== "recebida");
  const valorAberto = abertas.reduce((s, c) => s + c.total, 0);
  const recebidas = deposito.compras.filter((c) => c.status === "recebida");
  const unidadesRecebidas = recebidas.reduce(
    (s, c) => s + c.itens.reduce((t, i) => t + i.quantidade, 0),
    0,
  );

  const totalRascunho = itens.reduce((s, it) => {
    const p = produtos.find((x) => x.id === it.produtoId);
    return s + (p?.custo ?? 0) * it.quantidade;
  }, 0);

  function adicionarItem(produtoId: string, quantidade: number) {
    setItens((atual) => {
      const existe = atual.find((i) => i.produtoId === produtoId);
      if (existe) {
        return atual.map((i) =>
          i.produtoId === produtoId ? { ...i, quantidade } : i,
        );
      }
      return [...atual, { produtoId, quantidade }];
    });
    setAviso("");
  }

  function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!itens.length) {
      setAviso("Adicione ao menos um produto à ordem.");
      return;
    }
    const ordem = criarCompra({
      fornecedor,
      previsao: previsao
        ? new Date(previsao).toISOString()
        : new Date(Date.now() + 7 * 86400000).toISOString(),
      itens: itens.filter((i) => i.quantidade > 0),
    });
    setItens([]);
    setPrevisao("");
    setAviso(`Ordem ${ordem.id} criada como rascunho.`);
  }

  return (
    <div className="flex flex-col gap-6">
      <TituloPagina
        titulo="Setor de compras"
        descricao="Controla tudo que entra no estoque. A mercadoria só é somada quando a ordem é marcada como recebida."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          rotulo="Ordens em aberto"
          valor={numero(abertas.length)}
          tom={abertas.length ? "atencao" : "positivo"}
        />
        <Kpi
          rotulo="Valor em aberto"
          valor={moeda(valorAberto)}
          apoio="compromisso com fornecedores"
        />
        <Kpi rotulo="Ordens recebidas" valor={numero(recebidas.length)} />
        <Kpi
          rotulo="Unidades já recebidas"
          valor={numero(unidadesRecebidas)}
          apoio="somadas ao estoque"
        />
      </div>

      {/* Sugestões automáticas */}
      <Cartao
        titulo="Sugestão de reposição"
        descricao="Calculada pelo giro dos últimos 30 dias, para cobrir 45 dias de venda. Clique para jogar na ordem."
      >
        {sugestoes.length === 0 ? (
          <p className="rounded-lg bg-verde-claro px-3 py-3 text-[13px] text-verde-texto">
            Nada a repor: todos os SKUs estão acima de 40% do estoque-alvo.
          </p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-cinza-200">
                  {[
                    "Produto",
                    "Status",
                    "Estoque",
                    "Média/dia",
                    "Cobertura",
                    "Sugestão",
                    "",
                  ].map((c, i) => (
                    <th
                      key={c || i}
                      scope="col"
                      className={`px-2 py-2 font-semibold text-cinza-500 ${
                        i >= 2 && i <= 5 ? "text-right" : "text-left"
                      }`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sugestoes.map((s) => {
                  const nivel = nivelEstoque(s.produto);
                  const jaNaOrdem = itens.some(
                    (i) => i.produtoId === s.produto.id,
                  );
                  return (
                    <tr
                      key={s.produto.id}
                      className="border-b border-cinza-200 last:border-0"
                    >
                      <td className="px-2 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-noite">
                            {s.produto.nome}
                          </span>
                          <span className="font-mono text-[11px] text-cinza-500">
                            {s.produto.fornecedor}
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
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-noite">
                        {s.produto.estoque}
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-cinza-600">
                        {s.mediaDiaria.toFixed(1)}
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums">
                        <span
                          className={
                            s.diasCobertura < 7
                              ? "font-bold text-vermelho-texto"
                              : s.diasCobertura < 21
                                ? "font-bold text-ambar"
                                : "text-cinza-600"
                          }
                        >
                          {Number.isFinite(s.diasCobertura)
                            ? `${Math.floor(s.diasCobertura)} dias`
                            : "sem giro"}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-right font-mono font-bold tabular-nums text-noite">
                        {s.sugestaoCompra} un.
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setFornecedor(s.produto.fornecedor);
                            adicionarItem(s.produto.id, s.sugestaoCompra);
                          }}
                          className="btn btn-outline btn-sm"
                        >
                          {jaNaOrdem ? "Atualizar" : "Adicionar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {/* Nova ordem */}
      <Cartao
        titulo="Nova ordem de compra"
        descricao="Monte a ordem, salve como rascunho, envie ao fornecedor e receba quando a mercadoria chegar."
      >
        <form onSubmit={criar} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fornecedor" className="rotulo">
                Fornecedor
              </label>
              <select
                id="fornecedor"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                className="campo"
              >
                {FORNECEDORES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="previsao" className="rotulo">
                Previsão de entrega
              </label>
              <input
                id="previsao"
                type="date"
                value={previsao}
                onChange={(e) => setPrevisao(e.target.value)}
                className="campo"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="add-produto" className="rotulo">
              Adicionar produto
            </label>
            <select
              id="add-produto"
              value=""
              onChange={(e) => {
                if (e.target.value) adicionarItem(e.target.value, 10);
              }}
              className="campo"
            >
              <option value="">Selecione um produto…</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — custo {moeda(p.custo)}
                </option>
              ))}
            </select>
          </div>

          {itens.length > 0 && (
            <ul className="flex flex-col divide-y divide-cinza-200 rounded-xl border border-cinza-200">
              {itens.map((it) => {
                const p = produtos.find((x) => x.id === it.produtoId);
                if (!p) return null;
                return (
                  <li
                    key={it.produtoId}
                    className="flex flex-wrap items-center gap-3 p-3"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-[13px] font-semibold text-noite">
                        {p.nome}
                      </span>
                      <span className="font-mono text-[11px] text-cinza-500">
                        custo {moeda(p.custo)} · estoque atual {p.estoque}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={it.quantidade}
                      onChange={(e) =>
                        adicionarItem(
                          it.produtoId,
                          Math.max(1, Number(e.target.value)),
                        )
                      }
                      className="h-9 w-20 rounded-lg border border-cinza-300 px-2 text-right font-mono text-[13px] tabular-nums outline-none focus:border-azul"
                      aria-label={`Quantidade de ${p.nome}`}
                    />
                    <span className="w-24 text-right font-mono text-[13px] font-bold tabular-nums text-noite">
                      {moeda(p.custo * it.quantidade)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setItens((a) =>
                          a.filter((x) => x.produtoId !== it.produtoId),
                        )
                      }
                      className="text-[13px] font-semibold text-cinza-500 underline hover:text-vermelho-texto"
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {aviso && (
            <p
              role="status"
              className="rounded-lg border border-cinza-200 bg-cinza-50 px-3 py-2.5 text-[13px] text-cinza-600"
            >
              {aviso}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cinza-200 pt-4">
            <span className="text-[14px] text-cinza-600">
              Total da ordem:{" "}
              <strong className="text-[18px] font-extrabold text-noite">
                {moeda(totalRascunho)}
              </strong>
            </span>
            <button type="submit" className="btn btn-primary" disabled={!itens.length}>
              Criar ordem de compra
            </button>
          </div>
        </form>
      </Cartao>

      {/* Ordens */}
      <Cartao
        titulo="Ordens de compra"
        descricao="Receber uma ordem é o que dá entrada da mercadoria no estoque."
      >
        <ul className="flex flex-col gap-3">
          {deposito.compras.map((c) => (
            <li
              key={c.id}
              className="flex flex-col gap-3 rounded-xl border border-cinza-200 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[15px] font-bold text-noite">
                      {c.id}
                    </span>
                    <span
                      className={`badge ${ESTILO_STATUS[c.status]} !px-2 !py-1 !text-[11px]`}
                    >
                      {ROTULO_STATUS[c.status]}
                    </span>
                  </div>
                  <span className="text-[13px] text-cinza-600">
                    {c.fornecedor} · criada em {dataLonga(c.data)} ·{" "}
                    {c.status === "recebida" && c.recebidaEm
                      ? `recebida em ${dataLonga(c.recebidaEm)}`
                      : `previsão ${dataLonga(c.previsao)}`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] font-bold tabular-nums text-noite">
                    {moeda(c.total)}
                  </span>
                  {c.status === "rascunho" && (
                    <button
                      type="button"
                      onClick={() => enviarCompra(c.id)}
                      className="btn btn-outline btn-sm"
                    >
                      Enviar ao fornecedor
                    </button>
                  )}
                  {c.status !== "recebida" && (
                    <button
                      type="button"
                      onClick={() => receberCompra(c.id)}
                      className="btn btn-primary btn-sm"
                    >
                      Receber no estoque
                    </button>
                  )}
                </div>
              </div>

              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-cinza-200 pt-3">
                {c.itens.map((i) => {
                  const p = produtos.find((x) => x.id === i.produtoId);
                  return (
                    <li key={i.produtoId} className="text-[12px] text-cinza-600">
                      <span className="font-mono font-bold text-noite">
                        {i.quantidade}×
                      </span>{" "}
                      {p?.nome ?? i.produtoId}
                      <span className="font-mono text-cinza-400">
                        {" "}
                        ({moeda(i.custoUnitario)})
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </Cartao>
    </div>
  );
}
