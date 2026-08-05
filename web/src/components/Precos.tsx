import {
  DESCONTO_PIX,
  PARCELAS_MAX,
  descontoPercentual,
  moeda,
  parcela,
  precoPix,
} from "@/lib/formato";

/** Preço em display com centavos reduzidos — Brandbook 04/06. */
export function PrecoDisplay({
  valor,
  tamanho = 40,
  cor = "#08133A",
}: {
  valor: number;
  tamanho?: number;
  cor?: string;
}) {
  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100)
    .toString()
    .padStart(2, "0");
  return (
    <span className="t-display" style={{ fontSize: tamanho, color: cor }}>
      R$ {inteiro.toLocaleString("pt-BR")}
      <span style={{ fontSize: tamanho * 0.55 }}>,{centavos}</span>
    </span>
  );
}

/**
 * Bloco de preço — Brandbook 06. Hierarquia fixa: preço cheio riscado,
 * preço à vista em display, Pix em verde, parcelas em mono.
 */
export function BlocoPreco({
  precoDe,
  preco,
  tamanho = 40,
  className = "",
}: {
  precoDe: number;
  preco: number;
  tamanho?: number;
  className?: string;
}) {
  const desconto = descontoPercentual(precoDe, preco);
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {desconto > 0 && (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[15px] text-cinza-400 line-through">
            {moeda(precoDe)}
          </span>
          <span className="rounded-[5px] bg-amarelo px-2 py-1 text-[11px] font-extrabold text-noite">
            -{desconto}%
          </span>
        </div>
      )}
      <PrecoDisplay valor={preco} tamanho={tamanho} />
      <div className="text-[14px] font-semibold text-verde-texto">
        {moeda(precoPix(preco))} no Pix (-{Math.round(DESCONTO_PIX * 100)}%)
      </div>
      <div className="font-mono text-[13px] font-medium text-cinza-600">
        ou {PARCELAS_MAX}x {moeda(parcela(preco))} sem juros
      </div>
    </div>
  );
}
