import type { MetadataRoute } from "next";
import { CATEGORIAS, HOJE, PRODUTOS } from "@/lib/catalogo";

const SITE = "https://bigtechstor.netlify.app";

export default function sitemap(): MetadataRoute.Sitemap {
  // Data-âncora do mock. Com o back-end, vira a data real de atualização
  // de cada produto.
  const atualizado = HOJE;

  return [
    { url: SITE, lastModified: atualizado, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE}/produtos`,
      lastModified: atualizado,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...CATEGORIAS.map((c) => ({
      url: `${SITE}/produtos?categoria=${c.id}`,
      lastModified: atualizado,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...PRODUTOS.map((p) => ({
      url: `${SITE}/produtos/${p.slug}`,
      lastModified: atualizado,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
