import type { MetadataRoute } from "next";

const SITE = "https://bigtechstor.netlify.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Painel e páginas de fluxo de compra ficam fora do índice: são privadas
      // ou geram conteúdo duplicado competindo com a página do produto.
      disallow: ["/admin", "/admin/", "/checkout", "/checkout/", "/carrinho", "/pedido/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
