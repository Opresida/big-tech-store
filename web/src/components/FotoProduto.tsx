import type { Forma } from "@/lib/tipos";

/**
 * Placeholder de foto — Brandbook 06: quadro 1:1 hachurado com a silhueta
 * geométrica da categoria. Some assim que as fotos reais em fundo branco
 * entrarem no lugar.
 */

const SILHUETAS: Record<Forma, React.ReactNode> = {
  console: (
    <>
      <rect x="18" y="26" width="64" height="48" rx="6" />
      <path d="M32 40v20M22 50h20" />
      <circle cx="68" cy="46" r="3.5" />
      <circle cx="76" cy="54" r="3.5" />
    </>
  ),
  celular: (
    <>
      <rect x="34" y="14" width="32" height="72" rx="7" />
      <path d="M44 21h12" />
      <path d="M42 79h16" />
    </>
  ),
  notebook: (
    <>
      <rect x="22" y="26" width="56" height="36" rx="4" />
      <path d="M12 70h76l-6-8H18z" />
      <path d="M42 66h16" />
    </>
  ),
  audio: (
    <>
      <rect x="24" y="20" width="52" height="60" rx="10" />
      <circle cx="50" cy="42" r="11" />
      <circle cx="50" cy="66" r="6" />
    </>
  ),
  controle: (
    <>
      <path d="M28 38h44c8 0 12 8 13 18s-3 14-9 14-9-8-15-8H43c-6 0-9 8-15 8s-11-4-9-14 5-18 13-18z" />
      <path d="M35 52v10M30 57h10" />
      <circle cx="66" cy="53" r="3" />
      <circle cx="74" cy="60" r="3" />
    </>
  ),
};

export function FotoProduto({
  forma,
  rotulo,
  className = "",
  compacto = false,
}: {
  forma: Forma;
  rotulo?: string;
  className?: string;
  compacto?: boolean;
}) {
  return (
    <div
      className={`hachura relative flex aspect-square w-full items-center justify-center overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-[62%] w-[62%]"
        fill="none"
        stroke="#0B37D6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={rotulo ? `Ilustração de ${rotulo}` : "Foto do produto"}
      >
        {SILHUETAS[forma]}
      </svg>
      {!compacto && (
        <span className="t-label absolute bottom-3 left-0 right-0 text-center text-[9px] text-cinza-400">
          Foto do produto · 1:1
        </span>
      )}
    </div>
  );
}
