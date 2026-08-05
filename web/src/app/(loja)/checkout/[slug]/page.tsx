"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FotoProduto } from "@/components/FotoProduto";
import { Estrelas } from "@/components/Estrelas";
import { FormularioCheckout } from "@/components/loja/FormularioCheckout";
import {
  AvisoEscassez,
  ContadorOferta,
  ProvaSocial,
  SelosConfianca,
  fimDoDia,
  useDataFutura,
} from "@/components/loja/Gatilhos";
import { depoimentosDe } from "@/lib/depoimentos";
import { nivelEstoque } from "@/lib/estoque";
import {
  DESCONTO_PIX,
  PARCELAS_MAX,
  dataLonga,
  descontoPercentual,
  moeda,
  parcela,
  precoPix,
} from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import { agora, noPeriodo } from "@/lib/metricas";

/**
 * Checkout por produto: página de conversão de um item só, com depoimentos,
 * prova social e gatilhos de urgência/escassez ancorados no estoque real.
 */
export default function CheckoutProduto() {
  const { slug } = useParams<{ slug: string }>();
  const { produtoPorSlug, deposito, hidratado } = useLoja();
  const [quantidade, setQuantidade] = useState(1);
  const entrega = useDataFutura(5);

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

  const depoimentos = useMemo(
    () => (produto ? depoimentosDe(produto.id, produto.nome, 3) : []),
    [produto],
  );

  if (!produto) {
    if (!hidratado) return null;
    notFound();
  }

  const esgotado = nivelEstoque(produto) === "esgotado";
  const desconto = descontoPercentual(produto.precoDe, produto.preco);
  const total = produto.preco * quantidade;
  const economia = (produto.precoDe - produto.preco) * quantidade;
  const maxQtd = Math.max(1, Math.min(produto.estoque, 5));

  if (esgotado) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 lg:px-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-[26px] font-bold text-noite">
            {produto.nome} está esgotado
          </h1>
          <p className="text-[15px] leading-[1.55] text-cinza-600">
            Já pedimos reposição ao fornecedor. Enquanto isso, veja outras opções
            da mesma categoria.
          </p>
          <Link
            href={`/produtos?categoria=${produto.categoria}`}
            className="btn btn-cta"
          >
            Ver alternativas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cinza-50">
      {/* Faixa de urgência — prazo real, reinicia à meia-noite */}
      <div className="bg-noite">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <span className="text-[13px] font-semibold text-white">
            Preço promocional garantido até o fim do dia
          </span>
          <ContadorOferta alvo={fimDoDia()} rotulo="Termina em" tema="escuro" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] px-4 py-8 lg:px-8 lg:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="t-label text-[10px] text-cinza-500">
            Compra rápida · 1 produto
          </h2>
          <Link
            href={`/produtos/${produto.slug}`}
            className="text-[13px] font-semibold text-azul underline"
          >
            Ver detalhes completos do produto
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-8">
          {/* Coluna de conversão */}
          <div className="flex min-w-0 flex-col gap-6">
            {/* Produto */}
            <section className="flex flex-col gap-5 rounded-2xl bg-white p-5 sm:flex-row lg:p-6">
              <div className="w-full shrink-0 overflow-hidden rounded-xl border border-cinza-200 sm:w-44">
                <FotoProduto forma={produto.forma} rotulo={produto.nome} compacto />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {desconto > 0 && (
                    <span className="badge badge-oferta">-{desconto}% OFF</span>
                  )}
                  {produto.selos.includes("frete-gratis") && (
                    <span className="badge badge-frete">FRETE GRÁTIS</span>
                  )}
                </div>

                <h1 className="text-[22px] font-semibold leading-[1.25] text-noite sm:text-[26px]">
                  {produto.nome}
                </h1>

                <Estrelas
                  nota={produto.nota}
                  avaliacoes={produto.avaliacoes}
                  tamanho={15}
                />

                <div className="flex flex-col gap-1">
                  {desconto > 0 && (
                    <span className="text-[14px] text-cinza-400 line-through">
                      {moeda(produto.precoDe)}
                    </span>
                  )}
                  <span className="t-display text-[38px] text-noite">
                    {moeda(produto.preco)}
                  </span>
                  <span className="text-[14px] font-semibold text-verde-texto">
                    {moeda(precoPix(produto.preco))} no Pix (−
                    {Math.round(DESCONTO_PIX * 100)}%)
                  </span>
                  <span className="font-mono text-[13px] text-cinza-600">
                    ou {PARCELAS_MAX}x {moeda(parcela(produto.preco))} sem juros
                  </span>
                </div>

                <label className="mt-1 flex w-fit items-center gap-2">
                  <span className="rotulo">Quantidade</span>
                  <select
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                    className="campo !h-11 !w-20 !py-0"
                    aria-label="Quantidade"
                  >
                    {Array.from({ length: maxQtd }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <div className="rounded-2xl bg-white p-5 lg:p-6">
              <AvisoEscassez produto={produto} />
            </div>

            {/* Formulário */}
            <FormularioCheckout
              itens={[{ produtoId: produto.id, quantidade }]}
              total={total}
              canal="checkout-direto"
            />

            {/* Depoimentos */}
            <section className="flex flex-col gap-4 rounded-2xl bg-white p-5 lg:p-6">
              <h2 className="text-[19px] font-bold text-noite">
                Quem já comprou aprovou
              </h2>
              <ul className="grid gap-4 sm:grid-cols-3">
                {depoimentos.map((d, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-2.5 rounded-xl border border-cinza-200 p-4"
                  >
                    <Estrelas nota={d.nota} tamanho={13} />
                    <strong className="text-[14px] font-semibold leading-[1.35] text-noite">
                      {d.titulo}
                    </strong>
                    <p className="text-[13px] leading-[1.5] text-cinza-600">
                      {d.texto}
                    </p>
                    <div className="mt-auto flex flex-col gap-1 pt-1">
                      <span className="text-[12px] font-bold text-noite">
                        {d.nome}
                      </span>
                      <span className="text-[11px] text-cinza-500">{d.local}</span>
                      {d.compraVerificada && (
                        <span className="badge badge-ok mt-1 self-start !px-2 !py-1 !text-[10px]">
                          <span aria-hidden="true">✓</span> Compra verificada
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Resumo fixo */}
          <aside className="min-w-0 lg:sticky lg:top-6 lg:h-fit">
            <div className="flex flex-col gap-4 rounded-2xl bg-white p-5">
              <h2 className="text-[17px] font-bold text-noite">
                Resumo da compra
              </h2>

              <dl className="flex flex-col gap-2.5 text-[14px]">
                <div className="flex min-w-0 justify-between gap-3">
                  <dt className="min-w-0 truncate text-cinza-600">
                    {quantidade}× {produto.nome}
                  </dt>
                  <dd className="shrink-0 font-mono tabular-nums text-noite">
                    {moeda(total)}
                  </dd>
                </div>
                {economia > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-cinza-600">Você economiza</dt>
                    <dd className="font-mono font-bold tabular-nums text-verde-texto">
                      −{moeda(economia)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-cinza-600">Frete</dt>
                  <dd className="font-mono font-bold tabular-nums text-verde-texto">
                    Grátis
                  </dd>
                </div>
              </dl>

              <div className="border-t border-cinza-200 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[15px] font-bold text-noite">Total</span>
                  <span className="text-[26px] font-extrabold text-noite">
                    {moeda(total)}
                  </span>
                </div>
                <p className="mt-1.5 text-[14px] font-semibold text-verde-texto">
                  {moeda(precoPix(total))} pagando no Pix
                </p>
              </div>

              {entrega && (
                <p className="rounded-lg bg-azul-claro p-3 text-[12px] leading-[1.45] text-azul">
                  Comprando hoje, entrega prevista até{" "}
                  <strong>{dataLonga(entrega)}</strong>.
                </p>
              )}

              <ProvaSocial
                vendidos30={vendidos30}
                avaliacoes={produto.avaliacoes}
                compacto
              />
            </div>

            <div className="mt-4">
              <SelosConfianca />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
