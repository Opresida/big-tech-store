"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CardProduto } from "@/components/CardProduto";
import { FotoProduto } from "@/components/FotoProduto";
import { BlocoPreco } from "@/components/Precos";
import { Estrelas } from "@/components/Estrelas";
import { ContadorOferta, fimDoDia, SelosConfianca } from "@/components/loja/Gatilhos";
import { CATEGORIAS } from "@/lib/catalogo";
import { nivelEstoque } from "@/lib/estoque";
import { descontoPercentual, numero } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import { agora, noPeriodo, ranking } from "@/lib/metricas";

const ICONES: Record<string, string> = {
  consoles: "🎮",
  celulares: "📱",
  notebooks: "💻",
  audio: "🔊",
  acessorios: "🕹️",
};

export default function Home() {
  const { produtos, deposito, adicionarAoCarrinho } = useLoja();

  const ref = useMemo(() => agora(deposito), [deposito]);
  const recentes = useMemo(
    () => noPeriodo(deposito.pedidos, 30, ref),
    [deposito.pedidos, ref],
  );

  const maisVendidos = useMemo(() => {
    const rank = ranking(recentes, produtos);
    return rank
      .map((r) => produtos.find((p) => p.id === r.produtoId))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .filter((p) => p.estoque > 0)
      .slice(0, 5);
  }, [recentes, produtos]);

  const destaque = produtos.find((p) => p.id === "p01") ?? produtos[0];

  const ofertas = useMemo(
    () =>
      [...produtos]
        .filter((p) => p.estoque > 0)
        .sort(
          (a, b) =>
            descontoPercentual(b.precoDe, b.preco) -
            descontoPercentual(a.precoDe, a.preco),
        )
        .slice(0, 4),
    [produtos],
  );

  const ultimasUnidades = useMemo(
    () =>
      produtos.filter((p) => {
        const n = nivelEstoque(p);
        return n === "baixo" || n === "critico";
      }),
    [produtos],
  );

  const unidadesVendidas = recentes.reduce(
    (s, p) => s + p.itens.reduce((t, i) => t + i.quantidade, 0),
    0,
  );

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative overflow-hidden bg-noite text-white">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 88% 8%, rgba(255,106,0,.28), transparent 60%)",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto grid max-w-[1280px] items-center gap-10 px-4 py-12 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-16">
          <div className="flex flex-col gap-6">
            <span className="t-label w-fit rounded-md bg-white/10 px-3 py-2 text-[10px] text-amarelo">
              Ofertão do dia · 05 de agosto
            </span>

            <h1 className="t-display text-[40px] sm:text-[56px] lg:text-[64px]">
              Tecnologia
              <br />
              de verdade,
              <br />
              <span className="text-amarelo">no preço que cabe</span>
            </h1>

            <p className="max-w-lg text-[16px] leading-[1.55] text-white/70 sm:text-[18px]">
              Console, celular, notebook e som com nota fiscal, garantia e
              rastreio. Achou mais barato? A gente cobre.
            </p>

            <ContadorOferta alvo={fimDoDia()} tema="escuro" />

            <div className="flex flex-wrap gap-3">
              <Link href="/produtos?ofertas=1" className="btn btn-cta">
                Ver ofertas do dia
              </Link>
              <Link
                href="/produtos"
                className="btn border-2 border-white/25 text-white hover:bg-white/10"
              >
                Catálogo completo
              </Link>
            </div>

            <dl className="grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
              {[
                { v: `${numero(unidadesVendidas)}+`, r: "itens vendidos em 30 dias" },
                { v: "12x", r: "sem juros no cartão" },
                { v: "5%", r: "de desconto no Pix" },
              ].map((i) => (
                <div key={i.r} className="flex flex-col gap-1">
                  <dd className="text-[22px] font-extrabold leading-none text-white sm:text-[26px]">
                    {i.v}
                  </dd>
                  <dt className="text-[11px] leading-[1.35] text-white/50">
                    {i.r}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Card do produto em destaque */}
          {destaque && (
            <div className="rounded-2xl bg-white p-5 text-noite shadow-[0_24px_60px_rgba(0,0,0,.35)]">
              <div className="flex items-center justify-between gap-3">
                <span className="badge badge-oferta">
                  -{descontoPercentual(destaque.precoDe, destaque.preco)}% OFF
                </span>
                <Estrelas
                  nota={destaque.nota}
                  avaliacoes={destaque.avaliacoes}
                  tamanho={13}
                />
              </div>

              <Link href={`/produtos/${destaque.slug}`} className="mt-3 block">
                <div className="mx-auto max-w-[280px]">
                  <FotoProduto forma={destaque.forma} rotulo={destaque.nome} compacto />
                </div>
                <h2 className="mt-3 text-[19px] font-semibold leading-[1.3]">
                  {destaque.nome}
                </h2>
              </Link>

              <div className="mt-3">
                <BlocoPreco
                  precoDe={destaque.precoDe}
                  preco={destaque.preco}
                  tamanho={36}
                />
              </div>

              <Link
                href={`/checkout/${destaque.slug}`}
                className="btn btn-cta mt-4 w-full"
              >
                Comprar agora
              </Link>
              <button
                type="button"
                onClick={() => adicionarAoCarrinho(destaque.id)}
                className="btn btn-ghost mt-1 w-full"
              >
                Adicionar ao carrinho
              </button>
            </div>
          )}
        </div>

        <div className="flex h-2">
          <div className="flex-1 bg-azul" />
          <div className="flex-1 bg-laranja" />
          <div className="flex-1 bg-amarelo" />
        </div>
      </section>

      {/* CATEGORIAS — filtro divisor */}
      <section className="mx-auto w-full max-w-[1280px] px-4 py-10 lg:px-8 lg:py-14">
        <div className="mb-5 flex items-baseline gap-3">
          <span className="t-label text-[11px] text-azul">01</span>
          <h2 className="text-[24px] font-bold text-noite sm:text-[28px]">
            Compre por categoria
          </h2>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIAS.map((c) => {
            const qtd = produtos.filter((p) => p.categoria === c.id).length;
            return (
              <li key={c.id}>
                <Link
                  href={`/produtos?categoria=${c.id}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-cinza-200 p-4 transition hover:border-azul hover:bg-azul-claro"
                >
                  <span className="text-[26px] leading-none" aria-hidden="true">
                    {ICONES[c.id]}
                  </span>
                  <span className="text-[15px] font-bold text-noite">
                    {c.nome}
                  </span>
                  <span className="text-[12px] leading-[1.4] text-cinza-500">
                    {c.descricao}
                  </span>
                  <span className="mt-auto pt-1 font-mono text-[11px] text-azul">
                    {qtd} produtos
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* OFERTAS DO DIA */}
      <section className="bg-cinza-50 py-10 lg:py-14">
        <div className="mx-auto w-full max-w-[1280px] px-4 lg:px-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-3">
                <span className="t-label text-[11px] text-azul">02</span>
                <h2 className="text-[24px] font-bold text-noite sm:text-[28px]">
                  Ofertas do dia
                </h2>
              </div>
              <ContadorOferta alvo={fimDoDia()} />
            </div>
            <Link href="/produtos?ofertas=1" className="btn btn-outline btn-sm">
              Ver todas
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {ofertas.map((p) => (
              <CardProduto key={p.id} produto={p} />
            ))}
          </div>
        </div>
      </section>

      {/* MAIS VENDIDOS — prova social real */}
      <section className="mx-auto w-full max-w-[1280px] px-4 py-10 lg:px-8 lg:py-14">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline gap-3">
              <span className="t-label text-[11px] text-azul">03</span>
              <h2 className="text-[24px] font-bold text-noite sm:text-[28px]">
                Os 5 mais vendidos do mês
              </h2>
            </div>
            <p className="text-[14px] text-cinza-600">
              Ranking real dos últimos 30 dias — o mesmo número que o time de
              vendas enxerga no painel.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {maisVendidos.map((p, i) => (
            <div key={p.id} className="relative">
              {/* À direita: o canto esquerdo do card já é dos selos de oferta */}
              <span className="absolute -top-2 right-2 z-10 grid h-7 w-7 place-items-center rounded-lg bg-noite font-mono text-[13px] font-bold text-amarelo">
                {i + 1}
              </span>
              <CardProduto produto={p} />
            </div>
          ))}
        </div>
      </section>

      {/* ÚLTIMAS UNIDADES — escassez verdadeira */}
      {ultimasUnidades.length > 0 && (
        <section className="mx-auto w-full max-w-[1280px] px-4 pb-10 lg:px-8 lg:pb-14">
          <div className="rounded-2xl border border-ambar-borda bg-ambar-claro p-5 lg:p-7">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-3">
                  <span className="t-label text-[11px] text-ambar">04</span>
                  <h2 className="text-[24px] font-bold text-noite sm:text-[28px]">
                    Últimas unidades no estoque
                  </h2>
                </div>
                <p className="max-w-2xl text-[14px] leading-[1.5] text-cinza-600">
                  Quantidade real do nosso depósito, atualizada a cada venda.
                  Quando acaba, sai da lista — a gente não inventa urgência.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {ultimasUnidades.slice(0, 4).map((p) => (
                <CardProduto key={p.id} produto={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PROMESSA / PROVA — Brandbook 01 */}
      <section className="mx-auto w-full max-w-[1280px] px-4 pb-14 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col gap-5 rounded-2xl bg-noite p-6 text-white lg:p-8">
            <span className="t-label text-[10px] text-amarelo">
              A promessa da casa
            </span>
            <p className="text-[22px] font-semibold leading-[1.32] sm:text-[27px]">
              A BIG TECH STORE existe para que ninguém precise escolher entre
              confiança e preço baixo.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-l-4 border-laranja bg-white/5 p-4">
                <div className="t-label mb-2 text-[10px] text-amarelo">
                  Promessa
                </div>
                <div className="text-[15px] font-semibold">
                  Achou mais barato? A gente cobre.
                </div>
              </div>
              <div className="border-l-4 border-azul bg-white/5 p-4">
                <div className="t-label mb-2 text-[10px] text-amarelo">Prova</div>
                <div className="text-[15px] font-semibold">
                  Nota fiscal, garantia e rastreio em tudo.
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4 rounded-2xl border border-cinza-200 p-6 lg:p-8">
            <span className="t-label text-[10px] text-cinza-500">
              Por que confiar
            </span>
            <SelosConfianca />
            <p className="text-[13px] leading-[1.5] text-cinza-500">
              Loja 100% online, com entrega para todo o Brasil e suporte humano
              de segunda a sexta.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
