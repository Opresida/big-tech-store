"use client";

import Link from "next/link";
import { FotoProduto } from "@/components/FotoProduto";
import { BadgeEstoque } from "@/components/Estoque";
import { SelosConfianca } from "@/components/loja/Gatilhos";
import { DESCONTO_PIX, moeda, parcela, PARCELAS_MAX, precoPix } from "@/lib/formato";
import { useLoja } from "@/lib/loja";

export default function PaginaCarrinho() {
  const {
    carrinho,
    produtoPorId,
    definirQuantidade,
    removerDoCarrinho,
    hidratado,
  } = useLoja();

  const linhas = carrinho
    .map((item) => {
      const produto = produtoPorId(item.produtoId);
      return produto ? { produto, quantidade: item.quantidade } : null;
    })
    .filter((l): l is NonNullable<typeof l> => !!l);

  const subtotal = linhas.reduce(
    (s, l) => s + l.produto.preco * l.quantidade,
    0,
  );
  const economia = linhas.reduce(
    (s, l) => s + (l.produto.precoDe - l.produto.preco) * l.quantidade,
    0,
  );
  const totalItens = linhas.reduce((s, l) => s + l.quantidade, 0);
  const freteGratis = subtotal >= 299;

  if (!hidratado) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-16 text-cinza-500 lg:px-8">
        Carregando carrinho…
      </div>
    );
  }

  if (!linhas.length) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 lg:px-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <span className="text-[44px]" aria-hidden="true">🛒</span>
          <h1 className="text-[26px] font-bold text-noite">
            Seu carrinho está vazio
          </h1>
          <p className="text-[15px] leading-[1.55] text-cinza-600">
            Dá uma olhada nas ofertas do dia — tem console, celular e caixa de
            som com desconto de verdade.
          </p>
          <Link href="/produtos?ofertas=1" className="btn btn-cta">
            Ver ofertas do dia
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 lg:px-8 lg:py-10">
      <h1 className="mb-6 text-[28px] font-bold text-noite sm:text-[34px]">
        Meu carrinho{" "}
        <span className="font-mono text-[18px] font-medium text-cinza-500">
          ({totalItens} {totalItens === 1 ? "item" : "itens"})
        </span>
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <ul className="flex flex-col gap-3">
          {linhas.map(({ produto, quantidade }) => {
            const excedeu = quantidade > produto.estoque;
            return (
              <li
                key={produto.id}
                className="flex flex-col gap-4 rounded-xl border border-cinza-200 p-4 sm:flex-row"
              >
                <Link
                  href={`/produtos/${produto.slug}`}
                  className="w-full shrink-0 overflow-hidden rounded-lg sm:w-28"
                >
                  <FotoProduto forma={produto.forma} rotulo={produto.nome} compacto />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Link
                    href={`/produtos/${produto.slug}`}
                    className="text-[15px] font-semibold leading-[1.35] text-noite hover:text-azul"
                  >
                    {produto.nome}
                  </Link>
                  <span className="font-mono text-[12px] text-cinza-500">
                    SKU {produto.sku}
                  </span>
                  <BadgeEstoque produto={produto} className="self-start !px-2 !py-1 !text-[11px]" />

                  {excedeu && (
                    <p className="text-[12px] font-semibold text-vermelho-texto" role="alert">
                      Temos só {produto.estoque} em estoque — ajuste a quantidade
                      para fechar o pedido.
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
                    <div className="flex items-center gap-1 rounded-[10px] border border-cinza-300 p-1">
                      <button
                        type="button"
                        onClick={() => definirQuantidade(produto.id, quantidade - 1)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[18px] font-bold text-noite transition hover:bg-cinza-50"
                        aria-label={`Diminuir quantidade de ${produto.nome}`}
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-mono text-[14px] font-bold tabular-nums">
                        {quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => definirQuantidade(produto.id, quantidade + 1)}
                        disabled={quantidade >= produto.estoque}
                        className="grid h-8 w-8 place-items-center rounded-lg text-[18px] font-bold text-noite transition hover:bg-cinza-50 disabled:text-cinza-400"
                        aria-label={`Aumentar quantidade de ${produto.nome}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removerDoCarrinho(produto.id)}
                      className="text-[13px] font-semibold text-cinza-500 underline transition hover:text-vermelho-texto"
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1 sm:w-36">
                  {produto.precoDe > produto.preco && (
                    <span className="text-[13px] text-cinza-400 line-through">
                      {moeda(produto.precoDe * quantidade)}
                    </span>
                  )}
                  <span className="text-[19px] font-extrabold text-noite">
                    {moeda(produto.preco * quantidade)}
                  </span>
                  <span className="font-mono text-[11px] text-cinza-500">
                    {PARCELAS_MAX}x {moeda(parcela(produto.preco * quantidade))}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Resumo */}
        <aside className="lg:sticky lg:top-40 lg:h-fit">
          <div className="flex flex-col gap-4 rounded-2xl border border-cinza-200 p-5">
            <h2 className="text-[17px] font-bold text-noite">Resumo do pedido</h2>

            <dl className="flex flex-col gap-2.5 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-cinza-600">Subtotal</dt>
                <dd className="font-mono tabular-nums text-noite">
                  {moeda(subtotal)}
                </dd>
              </div>
              {economia > 0 && (
                <div className="flex justify-between">
                  <dt className="text-cinza-600">Você economiza</dt>
                  <dd className="font-mono tabular-nums font-bold text-verde-texto">
                    −{moeda(economia)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-cinza-600">Frete</dt>
                <dd
                  className={`font-mono tabular-nums ${freteGratis ? "font-bold text-verde-texto" : "text-noite"}`}
                >
                  {freteGratis ? "Grátis" : moeda(29.9)}
                </dd>
              </div>
            </dl>

            {!freteGratis && (
              <p className="rounded-lg bg-azul-claro p-3 text-[12px] leading-[1.45] text-azul">
                Faltam <strong>{moeda(299 - subtotal)}</strong> para o frete sair
                de graça.
              </p>
            )}

            <div className="border-t border-cinza-200 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] font-bold text-noite">Total</span>
                <span className="text-[26px] font-extrabold text-noite">
                  {moeda(subtotal + (freteGratis ? 0 : 29.9))}
                </span>
              </div>
              <p className="mt-1.5 text-[14px] font-semibold text-verde-texto">
                {moeda(precoPix(subtotal + (freteGratis ? 0 : 29.9)))} no Pix (−
                {Math.round(DESCONTO_PIX * 100)}%)
              </p>
              <p className="mt-1 font-mono text-[13px] text-cinza-600">
                ou {PARCELAS_MAX}x{" "}
                {moeda(parcela(subtotal + (freteGratis ? 0 : 29.9)))} sem juros
              </p>
            </div>

            <Link href="/checkout" className="btn btn-cta w-full">
              Fechar pedido
            </Link>
            <Link href="/produtos" className="btn btn-ghost w-full">
              Continuar comprando
            </Link>
          </div>

          <div className="mt-4">
            <SelosConfianca />
          </div>
        </aside>
      </div>
    </div>
  );
}
