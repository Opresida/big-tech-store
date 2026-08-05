"use client";

import Link from "next/link";
import { FotoProduto } from "@/components/FotoProduto";
import { FormularioCheckout } from "@/components/loja/FormularioCheckout";
import { SelosConfianca } from "@/components/loja/Gatilhos";
import { moeda } from "@/lib/formato";
import { BlocoCarregando } from "@/components/CarregandoMarca";
import { useLoja } from "@/lib/loja";

export default function PaginaCheckout() {
  const { carrinho, produtoPorId, limparCarrinho, hidratado } = useLoja();

  const linhas = carrinho
    .map((item) => {
      const produto = produtoPorId(item.produtoId);
      if (!produto) return null;
      return {
        produto,
        quantidade: Math.min(item.quantidade, produto.estoque),
      };
    })
    .filter((l): l is NonNullable<typeof l> => !!l && l.quantidade > 0);

  const subtotal = linhas.reduce((s, l) => s + l.produto.preco * l.quantidade, 0);
  const freteGratis = subtotal >= 299;
  const frete = freteGratis ? 0 : 29.9;
  const total = subtotal + frete;

  if (!hidratado) {
    return (
      <BlocoCarregando mensagem="Preparando o checkout" />
    );
  }

  if (!linhas.length) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 lg:px-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-[26px] font-bold text-noite">
            Não há itens disponíveis para fechar
          </h1>
          <p className="text-[15px] leading-[1.55] text-cinza-600">
            Seu carrinho está vazio ou os itens ficaram sem estoque enquanto você
            navegava.
          </p>
          <Link href="/produtos" className="btn btn-cta">
            Voltar ao catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 lg:px-8 lg:py-10">
      <div className="mb-6 flex flex-col gap-1.5">
        <h1 className="text-[28px] font-bold text-noite sm:text-[34px]">
          Fechar pedido
        </h1>
        <p className="text-[14px] text-cinza-600">
          {linhas.length} {linhas.length === 1 ? "produto" : "produtos"} · pagamento
          e entrega em uma etapa só.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <FormularioCheckout
          itens={linhas.map((l) => ({
            produtoId: l.produto.id,
            quantidade: l.quantidade,
          }))}
          total={total}
          aoConcluir={limparCarrinho}
        />

        <aside className="order-first lg:order-none lg:sticky lg:top-40 lg:h-fit">
          <div className="flex flex-col gap-4 rounded-2xl border border-cinza-200 p-5">
            <h2 className="text-[17px] font-bold text-noite">Resumo</h2>

            <ul className="flex flex-col gap-3">
              {linhas.map(({ produto, quantidade }) => (
                <li key={produto.id} className="flex gap-3">
                  <div className="w-14 shrink-0 overflow-hidden rounded-lg">
                    <FotoProduto forma={produto.forma} rotulo={produto.nome} compacto />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-noite">
                      {produto.nome}
                    </span>
                    <span className="font-mono text-[11px] text-cinza-500">
                      {quantidade} × {moeda(produto.preco)}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[13px] font-bold tabular-nums text-noite">
                    {moeda(produto.preco * quantidade)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="flex flex-col gap-2 border-t border-cinza-200 pt-4 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-cinza-600">Subtotal</dt>
                <dd className="font-mono tabular-nums">{moeda(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-cinza-600">Frete</dt>
                <dd
                  className={`font-mono tabular-nums ${freteGratis ? "font-bold text-verde-texto" : ""}`}
                >
                  {freteGratis ? "Grátis" : moeda(frete)}
                </dd>
              </div>
              <div className="mt-1 flex items-baseline justify-between border-t border-cinza-200 pt-3">
                <dt className="text-[15px] font-bold text-noite">Total</dt>
                <dd className="text-[24px] font-extrabold text-noite">
                  {moeda(total)}
                </dd>
              </div>
            </dl>

            <Link href="/carrinho" className="btn btn-ghost !h-10 w-full">
              Editar carrinho
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
