import { CATEGORIAS, HOJE } from "./catalogo";
import { MESES_CURTOS } from "./formato";
import type { Deposit, Pedido, Produto } from "./tipos";

const DIA = 86400000;

/** "Agora" das métricas: a data mais recente entre a semente e o relógio real. */
export function agora(deposito: Deposit) {
  const ultimo = deposito.pedidos[0]?.data;
  const t = Math.max(HOJE.getTime(), ultimo ? Date.parse(ultimo) : 0, Date.now());
  return new Date(t);
}

export const pedidosValidos = (pedidos: Pedido[]) =>
  pedidos.filter((p) => p.status !== "cancelado");

export function noPeriodo(pedidos: Pedido[], dias: number, ref: Date) {
  const inicio = ref.getTime() - dias * DIA;
  return pedidosValidos(pedidos).filter((p) => Date.parse(p.data) >= inicio);
}

export function periodoAnterior(pedidos: Pedido[], dias: number, ref: Date) {
  const fim = ref.getTime() - dias * DIA;
  const inicio = fim - dias * DIA;
  return pedidosValidos(pedidos).filter((p) => {
    const t = Date.parse(p.data);
    return t >= inicio && t < fim;
  });
}

export type Resumo = {
  receita: number;
  custo: number;
  margem: number;
  margemPercentual: number;
  pedidos: number;
  itens: number;
  ticketMedio: number;
};

export function resumo(pedidos: Pedido[]): Resumo {
  const receita = pedidos.reduce((s, p) => s + p.total, 0);
  const custo = pedidos.reduce((s, p) => s + p.custoTotal, 0);
  const itens = pedidos.reduce(
    (s, p) => s + p.itens.reduce((t, i) => t + i.quantidade, 0),
    0,
  );
  const margem = receita - custo;
  return {
    receita,
    custo,
    margem,
    margemPercentual: receita ? (margem / receita) * 100 : 0,
    pedidos: pedidos.length,
    itens,
    ticketMedio: pedidos.length ? receita / pedidos.length : 0,
  };
}

export function variacao(atual: number, anterior: number) {
  if (!anterior) return atual ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
}

export type LinhaRanking = {
  produtoId: string;
  nome: string;
  sku: string;
  categoria: string;
  unidades: number;
  receita: number;
  margem: number;
  pedidos: number;
};

/** Ranking de mais vendidos — base do "Top 5" do Analytics. */
export function ranking(pedidos: Pedido[], produtos: Produto[]): LinhaRanking[] {
  const mapa = new Map<string, LinhaRanking>();

  for (const pedido of pedidos) {
    for (const item of pedido.itens) {
      const produto = produtos.find((p) => p.id === item.produtoId);
      const atual = mapa.get(item.produtoId) ?? {
        produtoId: item.produtoId,
        nome: produto?.nome ?? item.nome,
        sku: item.sku,
        categoria:
          CATEGORIAS.find((c) => c.id === produto?.categoria)?.nome ?? "—",
        unidades: 0,
        receita: 0,
        margem: 0,
        pedidos: 0,
      };
      atual.unidades += item.quantidade;
      atual.receita += item.precoUnitario * item.quantidade;
      atual.margem += (item.precoUnitario - item.custoUnitario) * item.quantidade;
      atual.pedidos += 1;
      mapa.set(item.produtoId, atual);
    }
  }

  return [...mapa.values()].sort((a, b) => b.unidades - a.unidades);
}

export function receitaPorCategoria(pedidos: Pedido[], produtos: Produto[]) {
  const mapa = new Map<string, number>();
  for (const pedido of pedidos) {
    for (const item of pedido.itens) {
      const produto = produtos.find((p) => p.id === item.produtoId);
      const cat = CATEGORIAS.find((c) => c.id === produto?.categoria);
      const chave = cat?.nome ?? "Outros";
      mapa.set(chave, (mapa.get(chave) ?? 0) + item.precoUnitario * item.quantidade);
    }
  }
  return [...mapa.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export function porFormaPagamento(pedidos: Pedido[]) {
  const rotulos: Record<string, string> = {
    pix: "Pix",
    credito: "Crédito",
    boleto: "Boleto",
  };
  const mapa = new Map<string, { valor: number; qtd: number }>();
  for (const p of pedidos) {
    const chave = rotulos[p.pagamento] ?? p.pagamento;
    const atual = mapa.get(chave) ?? { valor: 0, qtd: 0 };
    atual.valor += p.total;
    atual.qtd += 1;
    mapa.set(chave, atual);
  }
  return [...mapa.entries()]
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.valor - a.valor);
}

export type PontoSerie = { rotulo: string; valor: number; secundario?: number };

/** Receita por dia dentro da janela. */
export function serieDiaria(
  pedidos: Pedido[],
  dias: number,
  ref: Date,
): PontoSerie[] {
  const pontos: PontoSerie[] = [];
  for (let d = dias - 1; d >= 0; d--) {
    const data = new Date(ref.getTime() - d * DIA);
    const chave = data.toISOString().slice(0, 10);
    const doDia = pedidos.filter((p) => p.data.slice(0, 10) === chave);
    pontos.push({
      rotulo: `${String(data.getUTCDate()).padStart(2, "0")}/${String(
        data.getUTCMonth() + 1,
      ).padStart(2, "0")}`,
      valor: doDia.reduce((s, p) => s + p.total, 0),
      secundario: doDia.length,
    });
  }
  return pontos;
}

/** Receita e custo por mês — visão do Financeiro. */
export function serieMensal(pedidos: Pedido[], meses: number, ref: Date) {
  const saida: {
    rotulo: string;
    receita: number;
    custo: number;
    margem: number;
    pedidos: number;
  }[] = [];

  for (let m = meses - 1; m >= 0; m--) {
    const data = new Date(
      Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - m, 1),
    );
    const ano = data.getUTCFullYear();
    const mes = data.getUTCMonth();
    const doMes = pedidos.filter((p) => {
      const d = new Date(p.data);
      return d.getUTCFullYear() === ano && d.getUTCMonth() === mes;
    });
    const receita = doMes.reduce((s, p) => s + p.total, 0);
    const custo = doMes.reduce((s, p) => s + p.custoTotal, 0);
    saida.push({
      rotulo: `${MESES_CURTOS[mes]}/${String(ano).slice(2)}`,
      receita,
      custo,
      margem: receita - custo,
      pedidos: doMes.length,
    });
  }
  return saida;
}

export type Cobertura = {
  produto: Produto;
  mediaDiaria: number;
  diasCobertura: number;
  vendidos30: number;
  sugestaoCompra: number;
};

/**
 * Giro e cobertura por produto — o que o Setor de Vendas usa para ver o que
 * está acabando antes de esgotar.
 */
export function cobertura(
  produtos: Produto[],
  pedidos: Pedido[],
  ref: Date,
  janela = 30,
): Cobertura[] {
  const recentes = noPeriodo(pedidos, janela, ref);
  return produtos
    .map((produto) => {
      const vendidos30 = recentes.reduce(
        (s, p) =>
          s +
          p.itens
            .filter((i) => i.produtoId === produto.id)
            .reduce((t, i) => t + i.quantidade, 0),
        0,
      );
      const mediaDiaria = vendidos30 / janela;
      const diasCobertura = mediaDiaria > 0 ? produto.estoque / mediaDiaria : Infinity;
      // Repor para 45 dias de cobertura, respeitando o estoque-alvo.
      const alvo = Math.max(Math.ceil(mediaDiaria * 45), produto.estoqueAlvo);
      return {
        produto,
        mediaDiaria,
        diasCobertura,
        vendidos30,
        sugestaoCompra: Math.max(0, alvo - produto.estoque),
      };
    })
    .sort((a, b) => a.diasCobertura - b.diasCobertura);
}

export function valorEstoque(produtos: Produto[]) {
  return produtos.reduce((s, p) => s + p.estoque * p.custo, 0);
}

export function valorEstoqueVenda(produtos: Produto[]) {
  return produtos.reduce((s, p) => s + p.estoque * p.preco, 0);
}
