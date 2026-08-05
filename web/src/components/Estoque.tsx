import {
  CLASSE_BADGE,
  CORES_NIVEL,
  nivelEstoque,
  percentualEstoque,
  rotuloEstoque,
} from "@/lib/estoque";
import type { Produto } from "@/lib/tipos";

/** Status de estoque — sempre com bolinha + texto, nunca cor sozinha. */
export function BadgeEstoque({
  produto,
  className = "",
}: {
  produto: Produto;
  className?: string;
}) {
  const nivel = nivelEstoque(produto);
  return (
    <span className={`badge ${CLASSE_BADGE[nivel]} ${className}`}>
      <span aria-hidden="true">●</span>
      {rotuloEstoque(produto)}
    </span>
  );
}

/**
 * Barra de estoque — Brandbook 06: verde acima de 40% do alvo,
 * âmbar entre 15–40%, vermelho abaixo de 15%.
 */
export function BarraEstoque({
  produto,
  mostrarTexto = true,
}: {
  produto: Produto;
  mostrarTexto?: boolean;
}) {
  const nivel = nivelEstoque(produto);
  const pct = percentualEstoque(produto);
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-2 overflow-hidden rounded-full bg-cinza-200"
        role="meter"
        aria-valuenow={produto.estoque}
        aria-valuemin={0}
        aria-valuemax={produto.estoqueAlvo}
        aria-label={`Estoque de ${produto.nome}`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: CORES_NIVEL[nivel] }}
        />
      </div>
      {mostrarTexto && (
        <span className="font-mono text-[11px] text-cinza-500">
          {produto.estoque} / {produto.estoqueAlvo} un. · {pct}% do alvo
        </span>
      )}
    </div>
  );
}
