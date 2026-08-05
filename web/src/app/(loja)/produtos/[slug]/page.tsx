"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CardProduto } from "@/components/CardProduto";
import { FotoProduto } from "@/components/FotoProduto";
import { BlocoPreco } from "@/components/Precos";
import { Estrelas } from "@/components/Estrelas";
import { Depoimentos } from "@/components/loja/Depoimentos";
import {
  AvisoEscassez,
  ContadorOferta,
  ProvaSocial,
  SelosConfianca,
  fimDoDia,
} from "@/components/loja/Gatilhos";
import { CATEGORIAS } from "@/lib/catalogo";
import { depoimentosDe } from "@/lib/depoimentos";
import { nivelEstoque } from "@/lib/estoque";
import { descontoPercentual } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import { agora, noPeriodo } from "@/lib/metricas";

export default function PaginaProduto() {
  const { slug } = useParams<{ slug: string }>();
  const { produtoPorSlug, produtos, deposito, adicionarAoCarrinho, hidratado } =
    useLoja();
  const [quantidade, setQuantidade] = useState(1);
  const [adicionado, setAdicionado] = useState(false);

  const produto = produtoPorSlug(slug);

  const vendidos30 = useMemo(() => {
    if (!produto) return 0;
    const ref = agora(deposito);
    return noPeriodo(deposito.pedidos, 30, ref).reduce(
      (s, p) =>
        s +
        p.itens
          .filter((i) => i.produtoId === produto.id)
          .reduce((t, i) => t + i.quantidade, 0),
      0,
    );
  }, [produto, deposito]);

  const relacionados = useMemo(() => {
    if (!produto) return [];
    return produtos
      .filter((p) => p.categoria === produto.categoria && p.id !== produto.id)
      .slice(0, 4);
  }, [produto, produtos]);

  const depoimentos = useMemo(
    () => (produto ? depoimentosDe(produto.id, produto.nome, 4) : []),
    [produto],
  );

  // Antes da hidratação o depósito é a semente, então o slug sempre resolve;
  // se mesmo assim não existir, é rota inválida.
  if (!produto) {
    if (!hidratado) return null;
    notFound();
  }

  const categoria = CATEGORIAS.find((c) => c.id === produto.categoria);
  const nivel = nivelEstoque(produto);
  const esgotado = nivel === "esgotado";
  const desconto = descontoPercentual(produto.precoDe, produto.preco);
  const maxQtd = Math.max(1, Math.min(produto.estoque, 5));

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 lg:px-8 lg:py-10">
      <nav aria-label="Trilha" className="mb-5 flex flex-wrap items-center gap-2 text-[13px]">
        <Link href="/" className="text-cinza-500 hover:text-azul">
          Início
        </Link>
        <span className="text-cinza-400" aria-hidden="true">/</span>
        <Link
          href={`/produtos?categoria=${produto.categoria}`}
          className="text-cinza-500 hover:text-azul"
        >
          {categoria?.nome}
        </Link>
        <span className="text-cinza-400" aria-hidden="true">/</span>
        <span className="font-semibold text-noite">{produto.nome}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* Foto + ficha */}
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-2xl border border-cinza-200">
            <FotoProduto forma={produto.forma} rotulo={produto.nome} />
            <div className="absolute left-4 top-4 flex flex-col items-start gap-2">
              {desconto > 0 && (
                <span className="badge badge-oferta">-{desconto}% OFF</span>
              )}
              {produto.selos.includes("lancamento") && (
                <span className="badge badge-lancamento">LANÇAMENTO</span>
              )}
              {produto.selos.includes("frete-gratis") && (
                <span className="badge badge-frete">FRETE GRÁTIS</span>
              )}
            </div>
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-[18px] font-bold text-noite">Ficha técnica</h2>
            <dl className="overflow-hidden rounded-xl border border-cinza-200">
              {produto.ficha.map((f, i) => (
                <div
                  key={f.rotulo}
                  className={`flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 ${
                    i % 2 ? "bg-white" : "bg-cinza-50"
                  }`}
                >
                  <dt className="text-[13px] font-semibold text-cinza-600">
                    {f.rotulo}
                  </dt>
                  <dd className="font-mono text-[13px] text-noite">{f.valor}</dd>
                </div>
              ))}
              <div className="flex flex-wrap items-baseline justify-between gap-2 bg-white px-4 py-3">
                <dt className="text-[13px] font-semibold text-cinza-600">SKU</dt>
                <dd className="font-mono text-[13px] text-noite">{produto.sku}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Compra */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <span className="t-label text-[10px] text-azul">{produto.marca}</span>
            <h1 className="text-[26px] font-semibold leading-[1.22] text-noite sm:text-[32px]">
              {produto.nome}
            </h1>
            <Estrelas
              nota={produto.nota}
              avaliacoes={produto.avaliacoes}
              tamanho={16}
            />
            <p className="text-[15px] leading-[1.55] text-cinza-600">
              {produto.resumo}
            </p>
          </div>

          <ul className="flex flex-col gap-2">
            {produto.destaques.map((d) => (
              <li key={d} className="flex items-start gap-2.5 text-[14px] text-noite">
                <span className="mt-0.5 text-verde" aria-hidden="true">✓</span>
                {d}
              </li>
            ))}
          </ul>

          <div className="rounded-2xl border border-cinza-200 p-5">
            <BlocoPreco
              precoDe={produto.precoDe}
              preco={produto.preco}
              tamanho={42}
            />

            <div className="mt-4 border-t border-cinza-200 pt-4">
              <ContadorOferta alvo={fimDoDia()} rotulo="Este preço vale por" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="rotulo">Qtd.</span>
                <select
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  disabled={esgotado}
                  className="campo !h-12 !w-20 !py-0"
                  aria-label="Quantidade"
                >
                  {Array.from({ length: maxQtd }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <Link
                href={`/checkout/${produto.slug}`}
                className={`btn btn-cta flex-1 ${esgotado ? "pointer-events-none opacity-50" : ""}`}
                aria-disabled={esgotado}
              >
                {esgotado ? "Indisponível" : "Comprar agora"}
              </Link>
            </div>

            <button
              type="button"
              disabled={esgotado}
              onClick={() => {
                adicionarAoCarrinho(produto.id, quantidade);
                setAdicionado(true);
              }}
              className="btn btn-primary mt-2 w-full"
            >
              Adicionar ao carrinho
            </button>

            {adicionado && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-verde-texto" role="status">
                <span className="badge badge-ok !px-2 !py-1 !text-[11px]">
                  <span aria-hidden="true">✓</span> No carrinho
                </span>
                <Link href="/carrinho" className="font-semibold underline">
                  Ver carrinho
                </Link>
              </p>
            )}

            <p className="mt-4 text-[12px] leading-[1.5] text-cinza-500">
              Vendido e entregue por BIG TECH STORE · {produto.fornecedor} ·
              Postagem em até 24h úteis.
            </p>
          </div>

          <AvisoEscassez produto={produto} />

          <ProvaSocial vendidos30={vendidos30} avaliacoes={produto.avaliacoes} />

          <SelosConfianca />
        </div>
      </div>

      {/* Depoimentos e prova social */}
      <div className="mt-14 border-t border-cinza-200 pt-10">
        <Depoimentos
          depoimentos={depoimentos}
          nota={produto.nota}
          avaliacoes={produto.avaliacoes}
        />
      </div>

      {relacionados.length > 0 && (
        <section className="mt-14 border-t border-cinza-200 pt-10">
          <h2 className="mb-5 text-[24px] font-bold text-noite sm:text-[28px]">
            Quem viu este, viu também
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {relacionados.map((p) => (
              <CardProduto key={p.id} produto={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
