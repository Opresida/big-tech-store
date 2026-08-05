"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Simbolo } from "@/components/Marca";
import { nivelEstoque } from "@/lib/estoque";
import { useLoja } from "@/lib/loja";

const ITENS = [
  { href: "/admin", rotulo: "Visão geral", icone: "▦", exato: true },
  { href: "/admin/estoque", rotulo: "Estoque", icone: "▤" },
  { href: "/admin/compras", rotulo: "Compras", icone: "↓" },
  { href: "/admin/vendas", rotulo: "Vendas", icone: "↑" },
  { href: "/admin/financeiro", rotulo: "Financeiro", icone: "$" },
  { href: "/admin/analytics", rotulo: "Analytics", icone: "◧" },
];

export function Navegacao() {
  const caminho = usePathname();
  const router = useRouter();
  const { sair, produtos, deposito } = useLoja();

  const alertas = produtos.filter((p) => {
    const n = nivelEstoque(p);
    return n !== "ok";
  }).length;

  const compras = deposito.compras.filter((c) => c.status !== "recebida").length;

  const contagem: Record<string, number> = {
    "/admin/estoque": alertas,
    "/admin/vendas": alertas,
    "/admin/compras": compras,
  };

  function estaAtivo(item: (typeof ITENS)[number]) {
    return item.exato ? caminho === item.href : caminho.startsWith(item.href);
  }

  function sairDoPainel() {
    sair();
    router.push("/admin/login");
  }

  return (
    <>
      {/* Barra lateral — desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-noite p-5 lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-3">
          <Simbolo tamanho={38} variante="azul" />
          <span className="flex flex-col">
            <span className="t-display text-[15px] text-white">Big Tech</span>
            <span className="t-label text-[9px] text-amarelo">Admin</span>
          </span>
        </Link>

        <nav className="flex flex-col gap-1" aria-label="Menu do painel">
          {ITENS.map((item) => {
            const ativo = estaAtivo(item);
            const n = contagem[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] font-semibold transition ${
                  ativo
                    ? "bg-azul text-white"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="w-4 text-center opacity-80" aria-hidden="true">
                  {item.icone}
                </span>
                <span className="flex-1">{item.rotulo}</span>
                {n > 0 && (
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[11px] font-bold ${
                      ativo ? "bg-white/20 text-white" : "bg-laranja text-white"
                    }`}
                  >
                    {n}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-4">
          <Link
            href="/"
            className="rounded-[10px] px-3 py-2.5 text-[13px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            ← Ver a loja
          </Link>
          <button
            type="button"
            onClick={sairDoPainel}
            className="rounded-[10px] px-3 py-2.5 text-left text-[13px] font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Sair do painel
          </button>
        </div>
      </aside>

      {/* Barra superior — mobile */}
      <div className="sticky top-0 z-40 flex flex-col bg-noite lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Simbolo tamanho={32} variante="azul" />
            <span className="t-label text-[10px] text-amarelo">Admin</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg px-2.5 py-2 text-[12px] font-semibold text-white/60"
            >
              Loja
            </Link>
            <button
              type="button"
              onClick={sairDoPainel}
              className="rounded-lg px-2.5 py-2 text-[12px] font-semibold text-white/60"
            >
              Sair
            </button>
          </div>
        </div>

        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-2"
          aria-label="Menu do painel"
        >
          {ITENS.map((item) => {
            const ativo = estaAtivo(item);
            const n = contagem[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition ${
                  ativo ? "bg-azul text-white" : "text-white/60"
                }`}
              >
                {item.rotulo}
                {n > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-laranja px-1 font-mono text-[10px] font-bold text-white">
                    {n}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

export function TituloPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[24px] font-bold text-noite sm:text-[30px]">
          {titulo}
        </h1>
        {descricao && (
          <p className="max-w-2xl text-[14px] leading-[1.5] text-cinza-600">
            {descricao}
          </p>
        )}
      </div>
      {acao}
    </header>
  );
}
