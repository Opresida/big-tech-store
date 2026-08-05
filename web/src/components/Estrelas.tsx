import { numero } from "@/lib/formato";

export function Estrelas({
  nota,
  avaliacoes,
  tamanho = 14,
  className = "",
}: {
  nota: number;
  avaliacoes?: number;
  tamanho?: number;
  className?: string;
}) {
  const cheias = Math.round(nota);
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <span
        className="flex"
        style={{ fontSize: tamanho, lineHeight: 1 }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} style={{ color: i < cheias ? "#FFC400" : "#D5DCE9" }}>
            ★
          </span>
        ))}
      </span>
      <span className="text-[13px] font-semibold text-noite">
        {nota.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
      </span>
      {avaliacoes !== undefined && (
        <span className="text-[13px] text-cinza-500">
          ({numero(avaliacoes)})
        </span>
      )}
      <span className="sr-only">
        Nota {nota} de 5
        {avaliacoes !== undefined ? `, ${avaliacoes} avaliações` : ""}
      </span>
    </span>
  );
}
