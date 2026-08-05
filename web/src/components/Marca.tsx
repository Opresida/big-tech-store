/**
 * Logo BIG TECH STORE — Brandbook 02.
 * Dois chevrons ascendentes: laranja na frente (ação), branco atrás (clareza).
 */

const CHEVRON = "polygon(0 0,55% 0,100% 50%,55% 100%,0 100%,45% 50%)";

type Variante = "azul" | "branco" | "mono";

export function Simbolo({
  tamanho = 44,
  variante = "azul",
  className = "",
}: {
  tamanho?: number;
  variante?: Variante;
  className?: string;
}) {
  const fundo =
    variante === "azul" ? "#0B37D6" : variante === "branco" ? "#fff" : "#08133A";
  const frente = variante === "mono" ? "#fff" : "#FF6A00";
  const tras =
    variante === "azul"
      ? "#fff"
      : variante === "branco"
        ? "#0B37D6"
        : "rgba(255,255,255,.45)";

  return (
    <span
      className={`grid shrink-0 place-items-center ${className}`}
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho * 0.25,
        background: fundo,
      }}
      aria-hidden="true"
    >
      <span
        className="flex"
        style={{ gap: Math.max(2, tamanho * 0.07) }}
      >
        <span
          style={{
            width: tamanho * 0.24,
            height: tamanho * 0.55,
            background: frente,
            clipPath: CHEVRON,
          }}
        />
        <span
          style={{
            width: tamanho * 0.24,
            height: tamanho * 0.55,
            background: tras,
            clipPath: CHEVRON,
          }}
        />
      </span>
    </span>
  );
}

export function Logo({
  tamanho = 44,
  variante = "azul",
  texto = true,
  corTexto,
  className = "",
}: {
  tamanho?: number;
  variante?: Variante;
  texto?: boolean;
  corTexto?: string;
  className?: string;
}) {
  return (
    <span className={`flex items-center gap-3 ${className}`}>
      <Simbolo tamanho={tamanho} variante={variante} />
      {texto && (
        <span
          className="t-display"
          style={{
            fontSize: tamanho * 0.42,
            letterSpacing: "-0.025em",
            lineHeight: 0.88,
            color: corTexto ?? "#08133A",
          }}
        >
          Big Tech
          <br />
          Store
        </span>
      )}
    </span>
  );
}
