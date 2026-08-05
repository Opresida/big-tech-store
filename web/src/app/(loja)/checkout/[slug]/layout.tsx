import type { Metadata } from "next";
import { PRODUTOS } from "@/lib/catalogo";
import { moeda } from "@/lib/formato";

/**
 * Checkout é página de conversão: título útil na aba do navegador, mas fora do
 * índice de busca. Quem chega aqui vem de um link direto ou da página do
 * produto — indexar criaria conteúdo duplicado competindo com a PDP.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const produto = PRODUTOS.find((p) => p.slug === slug);

  return {
    title: produto
      ? `Comprar ${produto.nome} — ${moeda(produto.preco)}`
      : "Checkout",
    robots: { index: false, follow: true },
  };
}

export default function LayoutCheckoutProduto({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
