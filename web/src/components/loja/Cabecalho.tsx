"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Marca";
import { CATEGORIAS } from "@/lib/catalogo";
import { useLoja } from "@/lib/loja";

export function Cabecalho() {
  const { itensNoCarrinho, hidratado } = useLoja();
  const [busca, setBusca] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const router = useRouter();

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const q = busca.trim();
    router.push(q ? `/produtos?busca=${encodeURIComponent(q)}` : "/produtos");
    setMenuAberto(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-cinza-200 bg-white">
      {/* Faixa de confiança */}
      <div className="bg-noite">
        <div className="mx-auto flex max-w-[1280px] items-center justify-center gap-x-6 gap-y-1 overflow-hidden px-4 py-2 sm:justify-between">
          <p className="t-label truncate text-[10px] text-amarelo">
            Achou mais barato? A gente cobre
          </p>
          <p className="hidden text-[12px] text-white/60 sm:block">
            Nota fiscal, garantia e rastreio em tudo · 12x sem juros
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 lg:gap-6 lg:px-8">
        <Link href="/" aria-label="BIG TECH STORE — início">
          <Logo tamanho={40} />
        </Link>

        <form
          onSubmit={buscar}
          role="search"
          className="hidden flex-1 md:flex"
          aria-label="Buscar produtos"
        >
          <div className="flex w-full items-center gap-2">
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="PS5, notebook, JBL..."
              className="campo"
              aria-label="Buscar produto"
            />
            <button type="submit" className="btn btn-primary shrink-0">
              Buscar
            </button>
          </div>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/carrinho"
            className="relative flex h-11 items-center gap-2 rounded-[10px] px-3 font-semibold text-noite transition hover:bg-cinza-50"
          >
            <span aria-hidden="true" className="text-lg">
              🛒
            </span>
            <span className="hidden sm:inline">Carrinho</span>
            {hidratado && itensNoCarrinho > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-laranja px-1 font-mono text-[11px] font-bold text-white">
                {itensNoCarrinho}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-[10px] text-noite transition hover:bg-cinza-50 md:hidden"
            onClick={() => setMenuAberto((v) => !v)}
            aria-expanded={menuAberto}
            aria-label="Abrir menu"
          >
            <span aria-hidden="true">{menuAberto ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {/* Navegação de categorias — desktop */}
      <nav
        className="mx-auto hidden max-w-[1280px] items-center gap-1 px-8 pb-2 md:flex"
        aria-label="Categorias"
      >
        <Link
          href="/produtos"
          className="rounded-lg px-3 py-2 text-[14px] font-semibold text-noite transition hover:bg-azul-claro hover:text-azul"
        >
          Todos os produtos
        </Link>
        {CATEGORIAS.map((c) => (
          <Link
            key={c.id}
            href={`/produtos?categoria=${c.id}`}
            className="rounded-lg px-3 py-2 text-[14px] text-cinza-600 transition hover:bg-azul-claro hover:text-azul"
          >
            {c.nome}
          </Link>
        ))}
        <Link
          href="/produtos?ofertas=1"
          className="ml-auto rounded-lg px-3 py-2 text-[14px] font-bold text-laranja transition hover:bg-laranja-claro"
        >
          Ofertas do dia
        </Link>
      </nav>

      {/* Menu mobile */}
      {menuAberto && (
        <div className="border-t border-cinza-200 bg-white px-4 py-4 md:hidden">
          <form onSubmit={buscar} role="search" className="mb-3 flex gap-2">
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="PS5, notebook, JBL..."
              className="campo"
              aria-label="Buscar produto"
            />
            <button type="submit" className="btn btn-primary shrink-0 !px-4">
              Ir
            </button>
          </form>
          <div className="flex flex-col">
            <Link
              href="/produtos"
              onClick={() => setMenuAberto(false)}
              className="border-b border-cinza-200 py-3 font-semibold text-noite"
            >
              Todos os produtos
            </Link>
            {CATEGORIAS.map((c) => (
              <Link
                key={c.id}
                href={`/produtos?categoria=${c.id}`}
                onClick={() => setMenuAberto(false)}
                className="border-b border-cinza-200 py-3 text-cinza-600"
              >
                {c.nome}
              </Link>
            ))}
            <Link
              href="/produtos?ofertas=1"
              onClick={() => setMenuAberto(false)}
              className="py-3 font-bold text-laranja"
            >
              Ofertas do dia
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
