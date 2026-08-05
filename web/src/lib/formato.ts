const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const BRL_COMPACTO = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const NUM = new Intl.NumberFormat("pt-BR");

export const moeda = (v: number) => BRL.format(v);
export const moedaCompacta = (v: number) => BRL_COMPACTO.format(v);
export const numero = (v: number) => NUM.format(v);

export const percentual = (v: number, casas = 1) =>
  `${v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;

/** Preço no Pix: -5% sobre o preço à vista (Brandbook 06). */
export const DESCONTO_PIX = 0.05;
export const precoPix = (v: number) => v * (1 - DESCONTO_PIX);

/** Parcelamento padrão da loja: 12x sem juros. */
export const PARCELAS_MAX = 12;
export const parcela = (v: number, n = PARCELAS_MAX) => v / n;

export const descontoPercentual = (de: number, por: number) =>
  de <= por ? 0 : Math.round(((de - por) / de) * 100);

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export const dataLonga = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const MESES_CURTOS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];
