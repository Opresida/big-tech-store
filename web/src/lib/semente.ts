import { HOJE, PESO_VENDA, PRODUTOS } from "./catalogo";
import type { Deposit, OrdemCompra, Pedido, Produto } from "./tipos";

/** PRNG determinístico — o histórico precisa sair igual no servidor e no cliente. */
function mulberry32(semente: number) {
  let a = semente;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMES = [
  "Ana Souza",
  "Bruno Lima",
  "Carla Mendes",
  "Diego Rocha",
  "Elaine Costa",
  "Felipe Araújo",
  "Gabriela Dias",
  "Henrique Alves",
  "Isabela Nunes",
  "João Pedro Reis",
  "Karina Melo",
  "Lucas Barbosa",
  "Marina Freitas",
  "Nathan Duarte",
  "Olívia Ramos",
  "Paulo Henrique",
  "Renata Campos",
  "Sérgio Tavares",
  "Tatiane Moreira",
  "Vinícius Prado",
];

const DIAS_HISTORICO = 90;

function escolherPorPeso(rand: () => number, produtos: Produto[]) {
  const total = produtos.reduce((s, p) => s + (PESO_VENDA[p.id] ?? 1), 0);
  let alvo = rand() * total;
  for (const p of produtos) {
    alvo -= PESO_VENDA[p.id] ?? 1;
    if (alvo <= 0) return p;
  }
  return produtos[produtos.length - 1];
}

/**
 * Histórico de vendas dos últimos 90 dias. Tem tendência de alta e pico de
 * fim de semana, para o Analytics e o Financeiro terem curva de verdade.
 */
export function gerarPedidos(): Pedido[] {
  const rand = mulberry32(20260805);
  const pedidos: Pedido[] = [];
  let seq = 1000;

  for (let d = DIAS_HISTORICO - 1; d >= 0; d--) {
    const dia = new Date(HOJE.getTime() - d * 86400000);
    const diaSemana = dia.getUTCDay();
    const fimDeSemana = diaSemana === 0 || diaSemana === 6;
    const tendencia = 1 + (DIAS_HISTORICO - d) / DIAS_HISTORICO / 2;
    const base = fimDeSemana ? 7 : 5;
    const qtdPedidos = Math.max(
      1,
      Math.round((base + rand() * 4) * tendencia * 0.6),
    );

    for (let i = 0; i < qtdPedidos; i++) {
      const nItens = rand() < 0.68 ? 1 : rand() < 0.85 ? 2 : 3;
      const usados = new Set<string>();
      const itens = [];

      for (let j = 0; j < nItens; j++) {
        const produto = escolherPorPeso(rand, PRODUTOS);
        if (usados.has(produto.id)) continue;
        usados.add(produto.id);
        const quantidade = rand() < 0.86 ? 1 : rand() < 0.96 ? 2 : 3;
        itens.push({
          produtoId: produto.id,
          nome: produto.nome,
          sku: produto.sku,
          quantidade,
          precoUnitario: produto.preco,
          custoUnitario: produto.custo,
        });
      }
      if (!itens.length) continue;

      const total = itens.reduce(
        (s, it) => s + it.precoUnitario * it.quantidade,
        0,
      );
      const custoTotal = itens.reduce(
        (s, it) => s + it.custoUnitario * it.quantidade,
        0,
      );
      const r = rand();
      const pagamento = r < 0.46 ? "pix" : r < 0.9 ? "credito" : "boleto";
      const rs = rand();
      const status = rs < 0.93 ? "aprovado" : rs < 0.98 ? "processando" : "cancelado";

      const hora = 8 + Math.floor(rand() * 14);
      const minuto = Math.floor(rand() * 60);
      const data = new Date(dia);
      data.setUTCHours(hora, minuto, 0, 0);

      pedidos.push({
        id: `BTS-${seq++}`,
        data: data.toISOString(),
        cliente: NOMES[Math.floor(rand() * NOMES.length)],
        itens,
        total: pagamento === "pix" ? Math.round(total * 0.95 * 100) / 100 : total,
        custoTotal,
        pagamento,
        status,
        canal: rand() < 0.7 ? "site" : "checkout-direto",
      });
    }
  }

  return pedidos.sort((a, b) => b.data.localeCompare(a.data));
}

/** Ordens de compra: algumas já recebidas, uma enviada e uma em rascunho. */
export function gerarCompras(): OrdemCompra[] {
  const dias = (n: number) =>
    new Date(HOJE.getTime() - n * 86400000).toISOString();
  const emDias = (n: number) =>
    new Date(HOJE.getTime() + n * 86400000).toISOString();

  const montar = (
    id: string,
    fornecedor: string,
    data: string,
    previsao: string,
    status: OrdemCompra["status"],
    itens: { produtoId: string; quantidade: number }[],
    recebidaEm?: string,
  ): OrdemCompra => {
    const completos = itens.map((it) => {
      const p = PRODUTOS.find((x) => x.id === it.produtoId)!;
      return { ...it, custoUnitario: p.custo };
    });
    return {
      id,
      fornecedor,
      data,
      previsao,
      status,
      recebidaEm,
      itens: completos,
      total: completos.reduce(
        (s, it) => s + it.custoUnitario * it.quantidade,
        0,
      ),
    };
  };

  return [
    montar(
      "OC-2041",
      "Sony Brasil",
      dias(52),
      dias(44),
      "recebida",
      [
        { produtoId: "p01", quantidade: 40 },
        { produtoId: "p17", quantidade: 80 },
      ],
      dias(44),
    ),
    montar(
      "OC-2042",
      "Harman JBL",
      dias(38),
      dias(30),
      "recebida",
      [
        { produtoId: "p14", quantidade: 60 },
        { produtoId: "p15", quantidade: 50 },
      ],
      dias(29),
    ),
    montar(
      "OC-2043",
      "Xiaomi Importação",
      dias(24),
      dias(12),
      "recebida",
      [{ produtoId: "p07", quantidade: 70 }],
      dias(11),
    ),
    montar("OC-2044", "Sony Brasil", dias(6), emDias(4), "enviada", [
      { produtoId: "p03", quantidade: 25 },
      { produtoId: "p19", quantidade: 60 },
    ]),
    montar("OC-2045", "Lenovo Brasil", dias(1), emDias(9), "rascunho", [
      { produtoId: "p12", quantidade: 30 },
    ]),
  ];
}

export function estadoInicial(): Deposit {
  return {
    produtos: PRODUTOS.map((p) => ({ ...p })),
    pedidos: gerarPedidos(),
    compras: gerarCompras(),
  };
}
