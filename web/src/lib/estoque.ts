import type { Produto } from "./tipos";

export type NivelEstoque = "ok" | "baixo" | "critico" | "esgotado";

/**
 * Barra de estoque — Brandbook 06:
 * verde acima de 40% do estoque-alvo, âmbar entre 15–40%, vermelho abaixo de 15%.
 * Mesma lógica no site e no admin.
 */
export function nivelEstoque(produto: Produto): NivelEstoque {
  if (produto.estoque <= 0) return "esgotado";
  const razao = produto.estoque / Math.max(produto.estoqueAlvo, 1);
  if (razao < 0.15) return "critico";
  if (razao < 0.4) return "baixo";
  return "ok";
}

export function percentualEstoque(produto: Produto) {
  return Math.min(
    100,
    Math.round((produto.estoque / Math.max(produto.estoqueAlvo, 1)) * 100),
  );
}

export const CORES_NIVEL: Record<NivelEstoque, string> = {
  ok: "var(--color-verde)",
  baixo: "var(--color-amarelo)",
  critico: "var(--color-vermelho)",
  esgotado: "var(--color-cinza-400)",
};

export const CLASSE_BADGE: Record<NivelEstoque, string> = {
  ok: "badge-ok",
  baixo: "badge-baixo",
  critico: "badge-esgotado",
  esgotado: "badge-esgotado",
};

export function rotuloEstoque(produto: Produto) {
  const nivel = nivelEstoque(produto);
  if (nivel === "esgotado") return "Esgotado";
  if (nivel === "critico") return `Estoque crítico · ${produto.estoque} un.`;
  if (nivel === "baixo") return `Estoque baixo · ${produto.estoque} un.`;
  return `Em estoque · ${produto.estoque} un.`;
}

/**
 * Versão curta, para o card da vitrine: no grid de 2 colunas do celular sobram
 * ~128px úteis, e o rótulo completo era recortado pela borda do card.
 * Mantém a palavra de status — cor sozinha não comunica.
 */
export function rotuloEstoqueCurto(produto: Produto) {
  const nivel = nivelEstoque(produto);
  if (nivel === "esgotado") return "Esgotado";
  if (nivel === "critico") return `Crítico · ${produto.estoque} un.`;
  if (nivel === "baixo") return `Baixo · ${produto.estoque} un.`;
  return "Em estoque";
}

export const ROTULO_NIVEL: Record<NivelEstoque, string> = {
  ok: "Saudável",
  baixo: "Baixo",
  critico: "Crítico",
  esgotado: "Esgotado",
};
