"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CardProduto } from "@/components/CardProduto";
import { BlocoCarregando } from "@/components/CarregandoMarca";
import { CATEGORIAS } from "@/lib/catalogo";
import { descontoPercentual } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import { agora, noPeriodo, ranking } from "@/lib/metricas";
import type { CategoriaId, Produto } from "@/lib/tipos";

type Ordenacao =
  | "relevancia"
  | "menor-preco"
  | "maior-preco"
  | "maior-desconto"
  | "mais-vendidos"
  | "melhor-nota";

const ORDENACOES: { valor: Ordenacao; rotulo: string }[] = [
  { valor: "relevancia", rotulo: "Relevância" },
  { valor: "mais-vendidos", rotulo: "Mais vendidos" },
  { valor: "menor-preco", rotulo: "Menor preço" },
  { valor: "maior-preco", rotulo: "Maior preço" },
  { valor: "maior-desconto", rotulo: "Maior desconto" },
  { valor: "melhor-nota", rotulo: "Melhor avaliados" },
];

const FAIXAS = [
  { id: "ate-500", rotulo: "Até R$ 500", min: 0, max: 500 },
  { id: "500-1500", rotulo: "R$ 500 a R$ 1.500", min: 500, max: 1500 },
  { id: "1500-3500", rotulo: "R$ 1.500 a R$ 3.500", min: 1500, max: 3500 },
  { id: "3500-6000", rotulo: "R$ 3.500 a R$ 6.000", min: 3500, max: 6000 },
  { id: "acima-6000", rotulo: "Acima de R$ 6.000", min: 6000, max: Infinity },
];

function Catalogo() {
  const { produtos, deposito } = useLoja();
  const params = useSearchParams();
  const router = useRouter();

  const busca = params.get("busca") ?? "";
  const soOfertas = params.get("ofertas") === "1";
  const categoriaUrl = params.get("categoria") as CategoriaId | null;

  const [categorias, setCategorias] = useState<CategoriaId[]>(
    categoriaUrl ? [categoriaUrl] : [],
  );
  const [marcas, setMarcas] = useState<string[]>([]);
  const [faixas, setFaixas] = useState<string[]>([]);
  const [soDisponivel, setSoDisponivel] = useState(false);
  const [ordem, setOrdem] = useState<Ordenacao>("relevancia");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Categoria vinda da URL manda: o menu do topo precisa trocar o filtro.
  const [ultimaUrl, setUltimaUrl] = useState(categoriaUrl);
  if (categoriaUrl !== ultimaUrl) {
    setUltimaUrl(categoriaUrl);
    setCategorias(categoriaUrl ? [categoriaUrl] : []);
  }

  const rank = useMemo(() => {
    const ref = agora(deposito);
    const mapa = new Map<string, number>();
    ranking(noPeriodo(deposito.pedidos, 30, ref), produtos).forEach((r) =>
      mapa.set(r.produtoId, r.unidades),
    );
    return mapa;
  }, [deposito, produtos]);

  const marcasDisponiveis = useMemo(
    () => [...new Set(produtos.map((p) => p.marca))].sort(),
    [produtos],
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const lista = produtos.filter((p: Produto) => {
      if (categorias.length && !categorias.includes(p.categoria)) return false;
      if (marcas.length && !marcas.includes(p.marca)) return false;
      if (soDisponivel && p.estoque <= 0) return false;
      if (soOfertas && descontoPercentual(p.precoDe, p.preco) < 15) return false;
      if (faixas.length) {
        const cabe = faixas.some((id) => {
          const f = FAIXAS.find((x) => x.id === id)!;
          return p.preco >= f.min && p.preco < f.max;
        });
        if (!cabe) return false;
      }
      if (termo) {
        const alvo =
          `${p.nome} ${p.marca} ${p.sku} ${p.resumo} ${p.categoria}`.toLowerCase();
        if (!termo.split(/\s+/).every((t) => alvo.includes(t))) return false;
      }
      return true;
    });

    const ordenado = [...lista];
    switch (ordem) {
      case "menor-preco":
        ordenado.sort((a, b) => a.preco - b.preco);
        break;
      case "maior-preco":
        ordenado.sort((a, b) => b.preco - a.preco);
        break;
      case "maior-desconto":
        ordenado.sort(
          (a, b) =>
            descontoPercentual(b.precoDe, b.preco) -
            descontoPercentual(a.precoDe, a.preco),
        );
        break;
      case "mais-vendidos":
        ordenado.sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0));
        break;
      case "melhor-nota":
        ordenado.sort((a, b) => b.nota - a.nota);
        break;
      default:
        // Relevância: disponível antes de esgotado, depois por giro.
        ordenado.sort((a, b) => {
          const dispo = Number(b.estoque > 0) - Number(a.estoque > 0);
          if (dispo) return dispo;
          return (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0);
        });
    }
    return ordenado;
  }, [
    produtos,
    categorias,
    marcas,
    faixas,
    soDisponivel,
    soOfertas,
    busca,
    ordem,
    rank,
  ]);

  const totalFiltros =
    categorias.length + marcas.length + faixas.length + (soDisponivel ? 1 : 0);

  function alternar<T>(lista: T[], set: (v: T[]) => void, valor: T) {
    set(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor]);
  }

  function limpar() {
    setCategorias([]);
    setMarcas([]);
    setFaixas([]);
    setSoDisponivel(false);
    router.push("/produtos");
  }

  const painelFiltros = (
    <div className="flex flex-col gap-6">
      <Grupo titulo="Categoria">
        {CATEGORIAS.map((c) => (
          <Caixa
            key={c.id}
            rotulo={c.nome}
            contagem={produtos.filter((p) => p.categoria === c.id).length}
            marcado={categorias.includes(c.id)}
            aoMudar={() => alternar(categorias, setCategorias, c.id)}
          />
        ))}
      </Grupo>

      <Grupo titulo="Marca">
        {marcasDisponiveis.map((m) => (
          <Caixa
            key={m}
            rotulo={m}
            contagem={produtos.filter((p) => p.marca === m).length}
            marcado={marcas.includes(m)}
            aoMudar={() => alternar(marcas, setMarcas, m)}
          />
        ))}
      </Grupo>

      <Grupo titulo="Faixa de preço">
        {FAIXAS.map((f) => (
          <Caixa
            key={f.id}
            rotulo={f.rotulo}
            contagem={
              produtos.filter((p) => p.preco >= f.min && p.preco < f.max).length
            }
            marcado={faixas.includes(f.id)}
            aoMudar={() => alternar(faixas, setFaixas, f.id)}
          />
        ))}
      </Grupo>

      <Grupo titulo="Disponibilidade">
        <Caixa
          rotulo="Somente em estoque"
          contagem={produtos.filter((p) => p.estoque > 0).length}
          marcado={soDisponivel}
          aoMudar={() => setSoDisponivel((v) => !v)}
        />
      </Grupo>

      {totalFiltros > 0 && (
        <button type="button" onClick={limpar} className="btn btn-ghost !h-10 !px-0 justify-start">
          Limpar filtros ({totalFiltros})
        </button>
      )}
    </div>
  );

  const tituloPagina = soOfertas
    ? "Ofertas do dia"
    : categorias.length === 1
      ? (CATEGORIAS.find((c) => c.id === categorias[0])?.nome ?? "Produtos")
      : busca
        ? `Resultados para “${busca}”`
        : "Todos os produtos";

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-8 lg:px-8 lg:py-10">
      <nav aria-label="Trilha" className="mb-4 flex items-center gap-2 text-[13px]">
        <Link href="/" className="text-cinza-500 hover:text-azul">
          Início
        </Link>
        <span className="text-cinza-400" aria-hidden="true">
          /
        </span>
        <span className="font-semibold text-noite">{tituloPagina}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[28px] font-bold text-noite sm:text-[34px]">
            {tituloPagina}
          </h1>
          <p className="text-[14px] text-cinza-600">
            {filtrados.length}{" "}
            {filtrados.length === 1 ? "produto encontrado" : "produtos encontrados"}
            {soOfertas ? " com 15% de desconto ou mais" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-outline btn-sm lg:hidden"
            onClick={() => setFiltrosAbertos((v) => !v)}
            aria-expanded={filtrosAbertos}
          >
            Filtros{totalFiltros > 0 ? ` (${totalFiltros})` : ""}
          </button>
          <label className="flex items-center gap-2">
            <span className="sr-only sm:not-sr-only sm:text-[13px] sm:text-cinza-600">
              Ordenar por
            </span>
            <select
              value={ordem}
              onChange={(e) => setOrdem(e.target.value as Ordenacao)}
              className="campo !h-10 !w-auto !py-0 pr-8 text-[14px]"
            >
              {ORDENACOES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-8">
        {/* Filtro divisor */}
        <aside className="hidden lg:block">
          <div className="sticky top-40">{painelFiltros}</div>
        </aside>

        {filtrosAbertos && (
          <div className="rounded-xl border border-cinza-200 p-4 lg:hidden">
            {painelFiltros}
          </div>
        )}

        <div>
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-cinza-200 px-6 py-16 text-center">
              <span className="text-[18px] font-bold text-noite">
                Nenhum produto com esses filtros
              </span>
              <p className="max-w-sm text-[14px] text-cinza-600">
                Tente afrouxar a faixa de preço ou limpar as marcas selecionadas.
              </p>
              <button type="button" onClick={limpar} className="btn btn-primary btn-sm">
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filtrados.map((p) => (
                <CardProduto key={p.id} produto={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Grupo({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5 border-0 p-0">
      <legend className="t-label mb-2 text-[10px] text-cinza-500">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Caixa({
  rotulo,
  contagem,
  marcado,
  aoMudar,
}: {
  rotulo: string;
  contagem?: number;
  marcado: boolean;
  aoMudar: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-noite">
      <input
        type="checkbox"
        checked={marcado}
        onChange={aoMudar}
        className="h-4 w-4 shrink-0 accent-[#0B37D6]"
      />
      <span className="flex-1">{rotulo}</span>
      {contagem !== undefined && (
        <span className="font-mono text-[11px] text-cinza-400">{contagem}</span>
      )}
    </label>
  );
}

export default function PaginaProdutos() {
  return (
    <Suspense fallback={<BlocoCarregando mensagem="Montando o catálogo" />}>
      <Catalogo />
    </Suspense>
  );
}
