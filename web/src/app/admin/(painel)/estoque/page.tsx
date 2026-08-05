"use client";

import { useMemo, useState } from "react";
import { TituloPagina } from "@/components/admin/Navegacao";
import { BarraEstoque } from "@/components/Estoque";
import { Kpi } from "@/components/viz/Kpi";
import { Cartao } from "@/components/viz/base";
import {
  CLASSE_BADGE,
  ROTULO_NIVEL,
  nivelEstoque,
  type NivelEstoque,
} from "@/lib/estoque";
import { CATEGORIAS } from "@/lib/catalogo";
import { moeda, numero } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import { valorEstoque, valorEstoqueVenda } from "@/lib/metricas";
import type { CategoriaId } from "@/lib/tipos";

const FILTROS: { id: NivelEstoque | "todos"; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "critico", rotulo: "Crítico" },
  { id: "baixo", rotulo: "Baixo" },
  { id: "esgotado", rotulo: "Esgotado" },
  { id: "ok", rotulo: "Saudável" },
];

export default function PaginaEstoque() {
  const { produtos, ajustarEstoque, definirEstoque, atualizarProduto } = useLoja();
  const [filtro, setFiltro] = useState<NivelEstoque | "todos">("todos");
  const [categoria, setCategoria] = useState<CategoriaId | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");

  const contagens = useMemo(() => {
    const c: Record<string, number> = { todos: produtos.length };
    for (const p of produtos) {
      const n = nivelEstoque(p);
      c[n] = (c[n] ?? 0) + 1;
    }
    return c;
  }, [produtos]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos
      .filter((p) => {
        if (filtro !== "todos" && nivelEstoque(p) !== filtro) return false;
        if (categoria !== "todas" && p.categoria !== categoria) return false;
        if (termo && !`${p.nome} ${p.sku} ${p.marca}`.toLowerCase().includes(termo))
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          a.estoque / Math.max(a.estoqueAlvo, 1) -
          b.estoque / Math.max(b.estoqueAlvo, 1),
      );
  }, [produtos, filtro, categoria, busca]);

  const emAlerta = produtos.filter((p) => nivelEstoque(p) !== "ok").length;

  function salvar(produtoId: string) {
    const n = Number(rascunho);
    if (Number.isFinite(n) && n >= 0) definirEstoque(produtoId, n);
    setEditando(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <TituloPagina
        titulo="Controle de estoque"
        descricao="Quantidade por SKU, estoque-alvo e alerta de ruptura. Ajustes aqui refletem na loja na hora."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi rotulo="SKUs cadastrados" valor={numero(produtos.length)} />
        <Kpi
          rotulo="SKUs em alerta"
          valor={numero(emAlerta)}
          tom={emAlerta > 0 ? "atencao" : "positivo"}
          apoio="abaixo de 40% do alvo"
        />
        <Kpi
          rotulo="Estoque a custo"
          valor={moeda(valorEstoque(produtos))}
          apoio="capital imobilizado"
        />
        <Kpi
          rotulo="Estoque a preço de venda"
          valor={moeda(valorEstoqueVenda(produtos))}
          apoio="potencial de receita"
        />
      </div>

      <Cartao
        titulo="Produtos"
        descricao="Ordenados do mais crítico para o mais saudável."
      >
        {/* Filtros — uma linha acima da tabela */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTROS.map((f) => {
              const ativo = filtro === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  aria-pressed={ativo}
                  className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                    ativo
                      ? "bg-azul text-white"
                      : "bg-cinza-50 text-cinza-600 hover:bg-cinza-100"
                  }`}
                >
                  {f.rotulo}
                  <span
                    className={`ml-1.5 font-mono text-[11px] ${ativo ? "text-white/70" : "text-cinza-400"}`}
                  >
                    {contagens[f.id] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, SKU ou marca..."
              className="campo !h-11 flex-1"
              aria-label="Buscar produto no estoque"
            />
            <select
              value={categoria}
              onChange={(e) =>
                setCategoria(e.target.value as CategoriaId | "todas")
              }
              className="campo !h-11 sm:!w-52"
              aria-label="Filtrar por categoria"
            >
              <option value="todas">Todas as categorias</option>
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-cinza-200">
                <th scope="col" className="px-2 py-2 text-left font-semibold text-cinza-500">
                  Produto
                </th>
                <th scope="col" className="px-2 py-2 text-left font-semibold text-cinza-500">
                  Status
                </th>
                <th scope="col" className="w-48 px-2 py-2 text-left font-semibold text-cinza-500">
                  Nível
                </th>
                <th scope="col" className="px-2 py-2 text-right font-semibold text-cinza-500">
                  Alvo
                </th>
                <th scope="col" className="px-2 py-2 text-right font-semibold text-cinza-500">
                  Custo un.
                </th>
                <th scope="col" className="px-2 py-2 text-center font-semibold text-cinza-500">
                  Quantidade
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const nivel = nivelEstoque(p);
                return (
                  <tr key={p.id} className="border-b border-cinza-200 last:border-0">
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-noite">{p.nome}</span>
                        <span className="font-mono text-[11px] text-cinza-500">
                          SKU {p.sku} · {p.marca}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <span className={`badge ${CLASSE_BADGE[nivel]} !px-2 !py-1 !text-[11px]`}>
                        <span aria-hidden="true">●</span>
                        {ROTULO_NIVEL[nivel]}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <BarraEstoque produto={p} />
                    </td>
                    <td className="px-2 py-3 text-right">
                      <input
                        type="number"
                        min={1}
                        value={p.estoqueAlvo}
                        onChange={(e) =>
                          atualizarProduto(p.id, {
                            estoqueAlvo: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="h-9 w-20 rounded-lg border border-cinza-300 px-2 text-right font-mono text-[13px] tabular-nums outline-none focus:border-azul"
                        aria-label={`Estoque-alvo de ${p.nome}`}
                      />
                    </td>
                    <td className="px-2 py-3 text-right font-mono tabular-nums text-cinza-600">
                      {moeda(p.custo)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => ajustarEstoque(p.id, -1)}
                          disabled={p.estoque <= 0}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-cinza-300 font-bold text-noite transition hover:bg-cinza-50 disabled:text-cinza-400"
                          aria-label={`Remover 1 de ${p.nome}`}
                        >
                          −
                        </button>

                        {editando === p.id ? (
                          <input
                            autoFocus
                            type="number"
                            min={0}
                            value={rascunho}
                            onChange={(e) => setRascunho(e.target.value)}
                            onBlur={() => salvar(p.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") salvar(p.id);
                              if (e.key === "Escape") setEditando(null);
                            }}
                            className="h-8 w-16 rounded-lg border border-azul px-2 text-center font-mono text-[13px] tabular-nums outline-none"
                            aria-label={`Quantidade de ${p.nome}`}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditando(p.id);
                              setRascunho(String(p.estoque));
                            }}
                            className="h-8 w-16 rounded-lg font-mono text-[15px] font-bold tabular-nums text-noite transition hover:bg-cinza-50"
                            aria-label={`Editar quantidade de ${p.nome}`}
                          >
                            {p.estoque}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => ajustarEstoque(p.id, 1)}
                          className="grid h-8 w-8 place-items-center rounded-lg border border-cinza-300 font-bold text-noite transition hover:bg-cinza-50"
                          aria-label={`Adicionar 1 a ${p.nome}`}
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {lista.length === 0 && (
          <p className="py-8 text-center text-[14px] text-cinza-500">
            Nenhum produto com esses filtros.
          </p>
        )}
      </Cartao>

      <p className="text-[12px] leading-[1.5] text-cinza-500">
        A entrada oficial de mercadoria acontece em{" "}
        <strong className="text-noite">Compras</strong>, ao receber uma ordem. Os
        botões acima são para acerto de inventário.
      </p>
    </div>
  );
}
