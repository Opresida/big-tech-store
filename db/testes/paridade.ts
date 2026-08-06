/**
 * Teste de paridade: banco × mock do front.
 *
 * Roda `src/lib/metricas.ts` sobre a semente determinística e compara, número a
 * número, com o que as funções SQL devolvem para a MESMA data de referência.
 *
 * É o teste que prova que o banco está certo. Se o painel lido do Postgres
 * mostrar um centavo diferente do painel lido do localStorage, é porque uma das
 * duas implementações está errada — e as duas estão à vista.
 *
 * Rodar:
 *   $env:DATABASE_URL = 'postgresql://...'
 *   npm run paridade
 */

import { Client } from "pg";

import { estadoInicial } from "../../web/src/lib/semente.ts";
import { descontoPercentual } from "../../web/src/lib/formato.ts";
import {
  agora,
  cobertura,
  noPeriodo,
  periodoAnterior,
  porFormaPagamento,
  ranking,
  receitaPorCategoria,
  resumo,
  serieDiaria,
  serieMensal,
} from "../../web/src/lib/metricas.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL antes de rodar (não versionamos credencial).");
  process.exit(2);
}

const JANELAS = [7, 30, 90];

/** Reais (float) → centavos (inteiro), a mesma conversão do gerador de seed. */
const cent = (v: number) => Math.round(v * 100);

let falhas = 0;
let conferidos = 0;

function conferir(rotulo: string, esperado: unknown, obtido: unknown, tol = 0) {
  conferidos++;
  let ok: boolean;
  if (typeof esperado === "number" && typeof obtido === "number") {
    ok = tol > 0 ? Math.abs(esperado - obtido) <= tol : esperado === obtido;
  } else {
    ok = String(esperado) === String(obtido);
  }
  if (!ok) {
    falhas++;
    console.error(`  ✗ ${rotulo}\n      mock: ${esperado}\n      banco: ${obtido}`);
  }
}

const cli = new Client({ connectionString: url, ssl: true });
await cli.connect();

const deposito = estadoInicial();
const produtos = deposito.produtos;
const pedidos = deposito.pedidos;

// A referência temporal precisa ser IDÊNTICA nos dois lados. `agora()` usa
// Date.now(), então o valor é calculado uma vez aqui e passado ao SQL — senão
// os dois lados olhariam janelas ligeiramente diferentes.
const ref = agora(deposito);
const refIso = ref.toISOString();

console.log(`Referência: ${refIso}`);
console.log(`Pedidos na semente: ${pedidos.length}\n`);

for (const dias of JANELAS) {
  console.log(`── Janela de ${dias} dias ────────────────────────────────`);

  // ---- Resumo (atual e anterior) -----------------------------------------
  for (const [deslocamento, lista] of [
    [0, noPeriodo(pedidos, dias, ref)],
    [1, periodoAnterior(pedidos, dias, ref)],
  ] as const) {
    const r = resumo(lista);
    const { rows } = await cli.query(
      "SELECT * FROM fn_resumo_periodo($1, $2::timestamptz, $3)",
      [dias, refIso, deslocamento],
    );
    const s = rows[0];
    const p = `resumo[${deslocamento === 0 ? "atual" : "anterior"}]`;
    conferir(`${p}.receita`, cent(r.receita), Number(s.receita_centavos));
    conferir(`${p}.custo`, cent(r.custo), Number(s.custo_centavos));
    conferir(`${p}.margem`, cent(r.margem), Number(s.margem_centavos));
    conferir(`${p}.pedidos`, r.pedidos, Number(s.pedidos));
    conferir(`${p}.itens`, r.itens, Number(s.itens));
    conferir(`${p}.margemPercentual`, r.margemPercentual, Number(s.margem_percentual), 1e-6);
    conferir(`${p}.ticketMedio`, r.ticketMedio * 100, Number(s.ticket_medio_centavos), 1e-4);
  }

  const doPeriodo = noPeriodo(pedidos, dias, ref);

  // ---- Ranking -------------------------------------------------------------
  // O front ordena só por unidades e se apoia na estabilidade do sort do JS.
  // Em SQL isso não existe, então as duas pontas usam o mesmo desempate.
  const rk = ranking(doPeriodo, produtos).sort(
    (a, b) =>
      b.unidades - a.unidades ||
      b.receita - a.receita ||
      a.produtoId.localeCompare(b.produtoId),
  );
  const { rows: rkSql } = await cli.query(
    "SELECT * FROM fn_ranking_produtos($1, $2::timestamptz)",
    [dias, refIso],
  );
  conferir("ranking.linhas", rk.length, rkSql.length);
  for (let i = 0; i < Math.min(rk.length, rkSql.length); i++) {
    const a = rk[i];
    const b = rkSql[i];
    conferir(`ranking[${i + 1}].produto`, a.produtoId, b.produto_id);
    conferir(`ranking[${i + 1}].unidades`, a.unidades, Number(b.unidades));
    conferir(`ranking[${i + 1}].receita`, cent(a.receita), Number(b.receita_centavos));
    conferir(`ranking[${i + 1}].margem`, cent(a.margem), Number(b.margem_centavos));
  }

  // ---- Receita por categoria ----------------------------------------------
  const cat = receitaPorCategoria(doPeriodo, produtos);
  const { rows: catSql } = await cli.query(
    "SELECT * FROM fn_receita_por_categoria($1, $2::timestamptz)",
    [dias, refIso],
  );
  conferir("categoria.linhas", cat.length, catSql.length);
  for (let i = 0; i < Math.min(cat.length, catSql.length); i++) {
    conferir(`categoria[${i}].nome`, cat[i].nome, catSql[i].categoria);
    conferir(`categoria[${i}].valor`, cent(cat[i].valor), Number(catSql[i].valor_centavos));
  }

  // ---- Formas de pagamento -------------------------------------------------
  const fp = porFormaPagamento(doPeriodo);
  const { rows: fpSql } = await cli.query(
    "SELECT * FROM fn_por_forma_pagamento($1, $2::timestamptz)",
    [dias, refIso],
  );
  conferir("pagamento.linhas", fp.length, fpSql.length);
  for (let i = 0; i < Math.min(fp.length, fpSql.length); i++) {
    conferir(`pagamento[${i}].nome`, fp[i].nome, fpSql[i].rotulo);
    conferir(`pagamento[${i}].valor`, cent(fp[i].valor), Number(fpSql[i].valor_centavos));
    conferir(`pagamento[${i}].qtd`, fp[i].qtd, Number(fpSql[i].quantidade));
  }

  // ---- Série diária --------------------------------------------------------
  // O ponto de atenção do projeto: o mock agrupa por dia UTC, o banco agrupa
  // pelo dia civil de São Paulo. Se algum pedido cruzar a virada, aparece aqui.
  const sd = serieDiaria(doPeriodo, dias, ref);
  const { rows: sdSql } = await cli.query(
    "SELECT * FROM fn_serie_diaria($1, $2::timestamptz)",
    [dias, refIso],
  );
  conferir("serieDiaria.pontos", sd.length, sdSql.length);
  for (let i = 0; i < Math.min(sd.length, sdSql.length); i++) {
    conferir(`serieDiaria[${sd[i].rotulo}].rotulo`, sd[i].rotulo, sdSql[i].rotulo);
    conferir(`serieDiaria[${sd[i].rotulo}].receita`, cent(sd[i].valor), Number(sdSql[i].receita_centavos));
    conferir(`serieDiaria[${sd[i].rotulo}].pedidos`, sd[i].secundario, Number(sdSql[i].pedidos));
  }
}

// ---- Série mensal ----------------------------------------------------------
// ATENÇÃO — divergência conhecida e intencional.
//
// A tela /admin/financeiro chama `serieMensal(deposito.pedidos, 4, ref)`, com a
// lista COMPLETA de pedidos. E `serieMensal()` não filtra status por dentro.
// Resultado: o gráfico "Resultado por mês" soma pedidos CANCELADOS como
// receita, enquanto os KPIs logo acima da mesma tela os excluem.
//
// O banco segue a regra do prompt ("pedidos cancelados não entram em nenhum
// cálculo") e exclui. Por isso a comparação abaixo passa a lista já filtrada:
// não é para mascarar a diferença — é para provar que, tirando o bug, as duas
// implementações batem. O tamanho do bug é medido logo depois.
console.log("── Série mensal (6 meses) ──────────────────────────────");
const sm = serieMensal(
  pedidos.filter((p) => p.status !== "cancelado"),
  6,
  ref,
);
const { rows: smSql } = await cli.query(
  "SELECT * FROM fn_serie_mensal($1, $2::timestamptz)",
  [6, refIso],
);
conferir("serieMensal.pontos", sm.length, smSql.length);
for (let i = 0; i < Math.min(sm.length, smSql.length); i++) {
  conferir(`serieMensal[${sm[i].rotulo}].rotulo`, sm[i].rotulo, smSql[i].rotulo);
  conferir(`serieMensal[${sm[i].rotulo}].receita`, cent(sm[i].receita), Number(smSql[i].receita_centavos));
  conferir(`serieMensal[${sm[i].rotulo}].custo`, cent(sm[i].custo), Number(smSql[i].custo_centavos));
  conferir(`serieMensal[${sm[i].rotulo}].pedidos`, sm[i].pedidos, Number(smSql[i].pedidos));
}

// ---- Cobertura de estoque --------------------------------------------------
console.log("── Cobertura de estoque (30 dias) ──────────────────────");
const cob = cobertura(produtos, pedidos, ref, 30);
const { rows: cobSql } = await cli.query(
  "SELECT * FROM fn_cobertura($1, $2::timestamptz)",
  [30, refIso],
);
const porId = new Map(cobSql.map((r) => [r.produto_id, r]));
conferir("cobertura.linhas", cob.length, cobSql.length);
for (const c of cob) {
  const b = porId.get(c.produto.id);
  if (!b) {
    falhas++;
    console.error(`  ✗ cobertura: produto ${c.produto.id} ausente no banco`);
    continue;
  }
  conferir(`cobertura[${c.produto.sku}].vendidos`, c.vendidos30, Number(b.vendidos));
  conferir(`cobertura[${c.produto.sku}].mediaDiaria`, c.mediaDiaria, Number(b.media_diaria), 1e-9);
  conferir(`cobertura[${c.produto.sku}].sugestao`, c.sugestaoCompra, Number(b.sugestao_compra));
  // Infinity no front = NULL no banco: "não vendeu nada na janela".
  const diasBanco = b.dias_cobertura === null ? Infinity : Number(b.dias_cobertura);
  conferir(`cobertura[${c.produto.sku}].diasCobertura`, c.diasCobertura, diasBanco, 1e-9);
}

// ---- Medida do bug do gráfico mensal ---------------------------------------
// Não é comparação: é o tamanho da diferença entre o que a tela mostra hoje e o
// que ela mostraria sem contar cancelado. Fica visível na saída do teste para
// não virar nota de rodapé esquecida num markdown.
const mensalComoATelaFaz = serieMensal(pedidos, 6, ref);
const inflacao = mensalComoATelaFaz.reduce((s, m, i) => s + (m.receita - sm[i].receita), 0);
const cancelados = pedidos.filter((p) => p.status === "cancelado");
console.log(
  `   ⚠ /admin/financeiro infla o gráfico mensal em R$ ${inflacao.toFixed(2)} ` +
    `(${cancelados.length} pedidos cancelados contados como receita).`,
);

// ---- Desconto percentual (coluna gerada da migration 011) ------------------
// A home escolhe as "Ofertas do dia" por este número e o catálogo corta em 15%.
// Arredondamento diferente entre front e banco trocaria os produtos em destaque.
console.log("── Desconto percentual (20 produtos) ───────────────────");
const { rows: descSql } = await cli.query(
  "SELECT id, desconto_percentual FROM produto ORDER BY id",
);
for (const linha of descSql) {
  const p = produtos.find((x) => x.id === linha.id)!;
  conferir(
    `desconto[${p.sku}]`,
    descontoPercentual(p.precoDe, p.preco),
    Number(linha.desconto_percentual),
  );
}

// ---- Giro por produto (fn_vendidos_por_produto) ----------------------------
// Ordenação "mais vendidos" do catálogo e <ProvaSocial> da página do produto.
console.log("── Vendidos por produto (30 dias) ──────────────────────");
const vendidosMock = new Map<string, number>();
for (const p of noPeriodo(pedidos, 30, ref)) {
  for (const i of p.itens) {
    vendidosMock.set(i.produtoId, (vendidosMock.get(i.produtoId) ?? 0) + i.quantidade);
  }
}
const { rows: vendSql } = await cli.query(
  "SELECT * FROM fn_vendidos_por_produto($1, $2::timestamptz)",
  [30, refIso],
);
conferir("vendidosPorProduto.linhas", produtos.length, vendSql.length);
for (const linha of vendSql) {
  const p = produtos.find((x) => x.id === linha.produto_id)!;
  conferir(
    `vendidos30[${p.sku}]`,
    vendidosMock.get(linha.produto_id) ?? 0,
    Number(linha.unidades),
  );
}

// ---- Valor de estoque ------------------------------------------------------
const { rows: veSql } = await cli.query("SELECT * FROM vw_valor_estoque");
const aCusto = produtos.reduce((s, p) => s + p.estoque * p.custo, 0);
const aVenda = produtos.reduce((s, p) => s + p.estoque * p.preco, 0);
conferir("valorEstoque.custo", cent(aCusto), Number(veSql[0].valor_a_custo_centavos));
conferir("valorEstoque.venda", cent(aVenda), Number(veSql[0].valor_a_venda_centavos));

await cli.end();

console.log(`\n${conferidos} comparações, ${falhas} divergência(s).`);
if (falhas > 0) {
  console.error("PARIDADE FALHOU.");
  process.exit(1);
}
console.log("PARIDADE OK — o banco reproduz o painel do mock.");
