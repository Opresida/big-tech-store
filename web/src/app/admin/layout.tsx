import type { Metadata } from "next";

/**
 * Layout de servidor que cobre login e painel. Existe só para o metadata:
 * a guarda de sessão fica em `(painel)/layout.tsx`, que é client component.
 *
 * `noindex` aqui é higiene de privacidade, não controle de acesso — o mesmo
 * cabeçalho é reforçado no netlify.toml. A proteção de verdade entra com a
 * autenticação de servidor na próxima etapa.
 */
export const metadata: Metadata = {
  title: "Painel administrativo",
  robots: { index: false, follow: false, nocache: true },
};

export default function LayoutAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
