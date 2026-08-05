import type { Metadata } from "next";
import { CATEGORIAS, PRODUTOS } from "@/lib/catalogo";
import { moeda, parcela, PARCELAS_MAX } from "@/lib/formato";

/**
 * A página do produto é client component (lê o estoque do mock no navegador),
 * então o metadata mora aqui, no layout, que é server component. É isto que o
 * WhatsApp, o Instagram e o X leem ao gerar a prévia do link.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const produto = PRODUTOS.find((p) => p.slug === slug);

  if (!produto) {
    return { title: "Produto não encontrado" };
  }

  const categoria = CATEGORIAS.find((c) => c.id === produto.categoria)?.nome;
  const descricao = `${moeda(produto.preco)} em até ${PARCELAS_MAX}x de ${moeda(
    parcela(produto.preco),
  )} sem juros. ${produto.resumo}`;

  // Declarar `openGraph` aqui SUBSTITUI o do layout raiz — e leva junto a
  // imagem que vinha da convenção de arquivo. Por isso ela é repetida à mão:
  // sem isto, a prévia do link do produto sai sem imagem nenhuma.
  const imagem = {
    url: "/opengraph-image.png",
    width: 1200,
    height: 630,
    alt: `${produto.nome} — BIG TECH STORE`,
  };

  return {
    title: produto.nome,
    description: descricao,
    alternates: { canonical: `/produtos/${produto.slug}` },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "BIG TECH STORE",
      url: `/produtos/${produto.slug}`,
      title: `${produto.nome} — ${moeda(produto.preco)}`,
      description: descricao,
      images: [imagem],
    },
    twitter: {
      card: "summary_large_image",
      title: `${produto.nome} — ${moeda(produto.preco)}`,
      description: descricao,
      images: [imagem],
    },
    other: {
      "product:brand": produto.marca,
      "product:price:amount": String(produto.preco),
      "product:price:currency": "BRL",
      ...(categoria ? { "product:category": categoria } : {}),
    },
  };
}

export default function LayoutProduto({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
