"use client";

import Link from "next/link";
import { FotoProduto } from "./FotoProduto";
import { PrecoDisplay } from "./Precos";
import { Estrelas } from "./Estrelas";
import { CLASSE_BADGE, nivelEstoque, rotuloEstoqueCurto } from "@/lib/estoque";
import { descontoPercentual, moeda, parcela, PARCELAS_MAX } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import type { Produto } from "@/lib/tipos";

export function CardProduto({ produto }: { produto: Produto }) {
  const { adicionarAoCarrinho } = useLoja();
  const desconto = descontoPercentual(produto.precoDe, produto.preco);
  const nivel = nivelEstoque(produto);
  const esgotado = nivel === "esgotado";

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-cinza-200 bg-white transition hover:border-azul hover:shadow-[0_10px_28px_rgba(8,19,58,.12)]">
      <Link
        href={`/produtos/${produto.slug}`}
        className="relative block"
        aria-label={produto.nome}
      >
        <FotoProduto forma={produto.forma} rotulo={produto.nome} compacto />
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {desconto > 0 && (
            <span className="rounded-[5px] bg-amarelo px-2 py-1.5 text-[11px] font-extrabold leading-none text-noite">
              -{desconto}%
            </span>
          )}
          {produto.selos.includes("lancamento") && (
            <span className="rounded-[5px] bg-azul px-2 py-1.5 text-[11px] font-bold leading-none text-white">
              LANÇAMENTO
            </span>
          )}
          {produto.selos.includes("frete-gratis") && (
            <span className="rounded-[5px] bg-noite px-2 py-1.5 text-[11px] font-bold leading-none text-amarelo">
              FRETE GRÁTIS
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <Link href={`/produtos/${produto.slug}`} className="block">
          <h3 className="line-clamp-2 text-[14px] font-semibold leading-[1.35] text-noite">
            {produto.nome}
          </h3>
        </Link>

        <Estrelas nota={produto.nota} avaliacoes={produto.avaliacoes} tamanho={12} />

        <div className="mt-auto flex flex-col gap-1 pt-1">
          {desconto > 0 && (
            <span className="text-[13px] text-cinza-400 line-through">
              {moeda(produto.precoDe)}
            </span>
          )}
          <PrecoDisplay valor={produto.preco} tamanho={26} />
          <span className="font-mono text-[12px] font-medium text-cinza-600">
            {PARCELAS_MAX}x {moeda(parcela(produto.preco))}
          </span>
          {/* whitespace-normal: rede de segurança — se o rótulo ainda assim não
              couber, ele quebra em vez de ser cortado pela borda do card. */}
          <span
            className={`badge ${CLASSE_BADGE[nivel]} mt-1 self-start !whitespace-normal !px-2 !py-1 !text-[11px]`}
          >
            <span aria-hidden="true">●</span>
            {rotuloEstoqueCurto(produto)}
          </span>
        </div>

        {/* Empilhados, não lado a lado: no grid de 2 colunas do celular o card
            tem ~143px úteis, e os dois botões juntos pedem ~204px — o segundo
            era cortado pelo overflow-hidden do card. Empilhado também dá alvo
            de toque maior. */}
        <div className="mt-2 flex flex-col gap-2">
          <button
            type="button"
            className="btn btn-primary btn-sm w-full"
            disabled={esgotado}
            onClick={() => adicionarAoCarrinho(produto.id)}
          >
            {esgotado ? "Indisponível" : "Adicionar"}
          </button>
          <Link
            href={`/checkout/${produto.slug}`}
            className={`btn btn-outline btn-sm w-full ${
              esgotado ? "pointer-events-none opacity-50" : ""
            }`}
            aria-disabled={esgotado}
            aria-label={`Comprar ${produto.nome} agora`}
          >
            Comprar agora
          </Link>
        </div>
      </div>
    </article>
  );
}
