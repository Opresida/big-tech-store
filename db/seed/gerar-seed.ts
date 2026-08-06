/**
 * Gerador do seed da BIG TECH STORE.
 *
 * Este script NÃO reimplementa a geração de dados: ele importa o gerador real
 * do front-end (`web/src/lib/semente.ts` e `web/src/lib/catalogo.ts`) e traduz
 * o resultado para SQL.
 *
 * O motivo é o objetivo do seed: o painel lido do banco tem de mostrar
 * exatamente os mesmos números do painel lido do `localStorage`, para dar para
 * comparar tela a tela e provar que o banco está certo. Reescrever o
 * `mulberry32` em PL/pgSQL (com `Math.imul` e aritmética de 32 bits) seria
 * fonte de divergência silenciosa — o número sairia "quase" igual.
 *
 * Rodar:  npm run seed:gerar
 * Saída:  db/seed/001_seed.sql  (artefato versionado; aplicar não exige Node)
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CATEGORIAS,
  FORNECEDORES,
  HOJE,
  PRODUTOS,
} from "../../web/src/lib/catalogo.ts";
import { gerarCompras, gerarPedidos } from "../../web/src/lib/semente.ts";
import type { Pedido, Produto } from "../../web/src/lib/tipos.ts";

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Reais (float) → centavos (inteiro). Todo dinheiro atravessa por aqui. */
const cent = (reais: number) => Math.round(reais * 100);

/** Escapa literal de texto para SQL. Nulo vira NULL sem aspas. */
const txt = (v: string | null | undefined) =>
  v === null || v === undefined ? "NULL" : `'${v.replace(/'/g, "''")}'`;

const ts = (iso: string) => `'${iso}'::TIMESTAMPTZ`;

const slugEmail = (nome: string) =>
  nome
    // Tira acento: decompõe e remove os diacríticos combinantes (U+0300–U+036F).
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");

/**
 * UUID determinístico e obviamente sintético para os clientes do histórico.
 * Precisa ser estável: rodar o gerador duas vezes tem que dar o mesmo arquivo.
 */
const uuidCliente = (i: number) =>
  `a0000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

const linhas: string[] = [];
const escrever = (s = "") => linhas.push(s);

// ---------------------------------------------------------------------------
// Dados vindos do front
// ---------------------------------------------------------------------------
const pedidos: Pedido[] = gerarPedidos();
const compras = gerarCompras();

// Ordem cronológica crescente para o livro de estoque (gerarPedidos devolve
// do mais novo para o mais velho).
const pedidosCronologicos = [...pedidos].sort((a, b) =>
  a.data.localeCompare(b.data),
);

const nomesClientes = [...new Set(pedidos.map((p) => p.cliente))].sort();
const idPorNome = new Map(nomesClientes.map((n, i) => [n, uuidCliente(i + 1)]));
const idFornecedor = new Map(FORNECEDORES.map((f, i) => [f, i + 1]));

// ---------------------------------------------------------------------------
// Cabeçalho
// ---------------------------------------------------------------------------
escrever("-- =============================================================================");
escrever("-- SEED — BIG TECH STORE");
escrever("-- =============================================================================");
escrever("-- ARQUIVO GERADO. Não edite à mão: rode `npm run seed:gerar` em db/.");
escrever("--");
escrever("-- Fonte: web/src/lib/catalogo.ts e web/src/lib/semente.ts — o mesmo gerador");
escrever("-- determinístico que alimenta o mock do front (mulberry32 com semente");
escrever(`-- 20260805, data-âncora ${HOJE.toISOString()}).`);
escrever("--");
escrever("-- Aplicar dentro de UMA transação. O applier (MCP, psql -1) já envolve.");
escrever("-- =============================================================================");
escrever();

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------
escrever("-- Categorias ------------------------------------------------------------------");
escrever("INSERT INTO categoria (id, nome, descricao, ordem) VALUES");
escrever(
  CATEGORIAS.map(
    (c, i) => `  (${txt(c.id)}, ${txt(c.nome)}, ${txt(c.descricao)}, ${i + 1})`,
  ).join(",\n") + ";",
);
escrever();

// ---------------------------------------------------------------------------
// Fornecedores
// ---------------------------------------------------------------------------
escrever("-- Fornecedores ----------------------------------------------------------------");
escrever("-- CNPJ e contato ficam nulos de propósito: o mock não tem esses dados e");
escrever("-- inventar documento de empresa é pior do que deixar em branco.");
escrever("-- prazo_medio_dias entra com o padrão de 15 dias, placeholder até o cadastro");
escrever("-- real de fornecedores (TODO.md).");
escrever("INSERT INTO fornecedor (id, nome, prazo_medio_dias) OVERRIDING SYSTEM VALUE VALUES");
escrever(
  FORNECEDORES.map((f, i) => `  (${i + 1}, ${txt(f)}, 15)`).join(",\n") + ";",
);
escrever("SELECT setval(pg_get_serial_sequence('fornecedor', 'id'), (SELECT MAX(id) FROM fornecedor));");
escrever();

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------
escrever("-- Produtos --------------------------------------------------------------------");
escrever(
  "INSERT INTO produto (id, slug, sku, nome, marca, categoria_id, fornecedor_id, forma,",
);
escrever(
  "  preco_de_centavos, preco_centavos, custo_centavos, estoque, estoque_alvo,",
);
escrever("  nota, avaliacoes, resumo, status) VALUES");
escrever(
  PRODUTOS.map((p: Produto) => {
    const forn = idFornecedor.get(p.fornecedor);
    if (!forn) throw new Error(`Fornecedor desconhecido: ${p.fornecedor}`);
    return (
      `  (${txt(p.id)}, ${txt(p.slug)}, ${txt(p.sku)}, ${txt(p.nome)}, ${txt(p.marca)}, ` +
      `${txt(p.categoria)}, ${forn}, ${txt(p.forma)}::forma_produto, ` +
      `${cent(p.precoDe)}, ${cent(p.preco)}, ${cent(p.custo)}, ${p.estoque}, ${p.estoqueAlvo}, ` +
      `${p.nota}, ${p.avaliacoes}, ${txt(p.resumo)}, 'ativo')`
    );
  }).join(",\n") + ";",
);
escrever();

// Selos, destaques e ficha técnica
const selos = PRODUTOS.flatMap((p) =>
  p.selos.map((s) => `  (${txt(p.id)}, ${txt(s)}::selo_produto)`),
);
if (selos.length) {
  escrever("INSERT INTO produto_selo (produto_id, selo) VALUES");
  escrever(selos.join(",\n") + ";");
  escrever();
}

const destaques = PRODUTOS.flatMap((p) =>
  p.destaques.map((d, i) => `  (${txt(p.id)}, ${i + 1}, ${txt(d)})`),
);
escrever("INSERT INTO produto_destaque (produto_id, ordem, texto) VALUES");
escrever(destaques.join(",\n") + ";");
escrever();

const fichas = PRODUTOS.flatMap((p) =>
  p.ficha.map((f, i) => `  (${txt(p.id)}, ${i + 1}, ${txt(f.rotulo)}, ${txt(f.valor)})`),
);
escrever("INSERT INTO produto_ficha (produto_id, ordem, rotulo, valor) VALUES");
escrever(fichas.join(",\n") + ";");
escrever();

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------
escrever("-- Clientes --------------------------------------------------------------------");
escrever("-- O histórico do mock guarda só o NOME do comprador. CPF e telefone ficam");
escrever("-- nulos: seed não inventa documento de pessoa. O e-mail usa o domínio");
escrever("-- reservado example.com (RFC 2606), que não existe e não entrega mensagem.");
escrever("-- A tabela `endereco` nasce vazia pelo mesmo motivo.");
escrever("INSERT INTO cliente (id, nome, email) VALUES");
escrever(
  nomesClientes
    .map(
      (n) =>
        `  ('${idPorNome.get(n)}'::UUID, ${txt(n)}, ${txt(`${slugEmail(n)}@example.com`)})`,
    )
    .join(",\n") + ";",
);
escrever();

// ---------------------------------------------------------------------------
// Usuários administrativos
// ---------------------------------------------------------------------------
escrever("-- Usuários do painel ----------------------------------------------------------");
escrever("-- A senha é a mesma da demonstração do front (CREDENCIAL_DEMO em loja.tsx).");
escrever("-- O hash é bcrypt de custo 12, gerado agora pelo próprio banco — nenhuma senha");
escrever("-- em texto claro fica armazenada. TROQUE ANTES DE QUALQUER USO REAL.");
escrever("INSERT INTO usuario_admin (nome, email, senha_hash, papel) VALUES");
escrever(
  [
    ["Administrador", "admin@bigtechstore.com.br", "admin"],
    ["Equipe de Estoque", "estoque@bigtechstore.com.br", "estoque"],
    ["Equipe de Compras", "compras@bigtechstore.com.br", "compras"],
    ["Equipe de Vendas", "vendas@bigtechstore.com.br", "vendas"],
    ["Financeiro", "financeiro@bigtechstore.com.br", "financeiro"],
  ]
    .map(
      ([nome, email, papel]) =>
        `  (${txt(nome)}, ${txt(email)}, crypt('bigtech123', gen_salt('bf', 12)), ${txt(papel)}::papel_admin)`,
    )
    .join(",\n") + ";",
);
escrever();

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
escrever("-- Pedidos ---------------------------------------------------------------------");
escrever(`-- ${pedidos.length} pedidos em 90 dias, com tendência de alta e pico de fim de semana.`);
escrever("-- O dinheiro vem decomposto: subtotal (Σ preço × qtd), desconto (Pix −5%),");
escrever("-- frete (zero — o Pedido do mock não tem frete) e total.");

const valoresPedido: string[] = [];
const valoresItem: string[] = [];

for (const p of pedidos) {
  const subtotal = p.itens.reduce(
    (s, i) => s + cent(i.precoUnitario) * i.quantidade,
    0,
  );
  const total = cent(p.total);
  const desconto = subtotal - total;
  const custo = cent(p.custoTotal);

  if (desconto < 0) {
    throw new Error(`Pedido ${p.id}: desconto negativo (${desconto})`);
  }
  if (p.pagamento !== "pix" && desconto !== 0) {
    throw new Error(`Pedido ${p.id}: desconto em pagamento ${p.pagamento}`);
  }

  valoresPedido.push(
    `  (${txt(p.id)}, '${idPorNome.get(p.cliente)}'::UUID, ${txt(p.cliente)}, ${ts(p.data)}, ` +
      `${txt(p.pagamento)}::forma_pagamento, ${txt(p.status)}::status_pedido, ` +
      `${txt(p.canal)}::canal_pedido, ${subtotal}, ${desconto}, 0, ${total}, ${custo})`,
  );

  for (const i of p.itens) {
    valoresItem.push(
      `  (${txt(p.id)}, ${txt(i.produtoId)}, ${txt(i.nome)}, ${txt(i.sku)}, ` +
        `${i.quantidade}, ${cent(i.precoUnitario)}, ${cent(i.custoUnitario)})`,
    );
  }
}

escrever(
  "INSERT INTO pedido (id, cliente_id, cliente_nome, data, pagamento, status, canal,",
);
escrever(
  "  subtotal_centavos, desconto_centavos, frete_centavos, total_centavos, custo_total_centavos) VALUES",
);
escrever(valoresPedido.join(",\n") + ";");
escrever();

escrever(
  "INSERT INTO item_pedido (pedido_id, produto_id, nome, sku, quantidade,",
);
escrever("  preco_unitario_centavos, custo_unitario_centavos) VALUES");
escrever(valoresItem.join(",\n") + ";");
escrever();

// A numeração do banco continua de onde o histórico parou.
const maiorPedido = Math.max(
  ...pedidos.map((p) => Number(p.id.replace("BTS-", ""))),
);
escrever(`SELECT setval('pedido_numero_seq', ${maiorPedido});`);
escrever();

// ---------------------------------------------------------------------------
// Ordens de compra
// ---------------------------------------------------------------------------
escrever("-- Ordens de compra ------------------------------------------------------------");
escrever("-- Três recebidas, uma enviada e uma em rascunho — para o painel já mostrar os");
escrever("-- três estados e as contas a pagar não nascerem vazias.");
escrever(
  "INSERT INTO ordem_compra (id, fornecedor_id, data, previsao, status, recebida_em, total_centavos) VALUES",
);
escrever(
  compras
    .map((c) => {
      const total = c.itens.reduce(
        (s, i) => s + cent(i.custoUnitario) * i.quantidade,
        0,
      );
      return (
        `  (${txt(c.id)}, ${idFornecedor.get(c.fornecedor)}, ${ts(c.data)}, ` +
        `'${c.previsao.slice(0, 10)}'::DATE, ${txt(c.status)}::status_ordem_compra, ` +
        `${c.recebidaEm ? ts(c.recebidaEm) : "NULL"}, ${total})`
      );
    })
    .join(",\n") + ";",
);
escrever();

escrever(
  "INSERT INTO item_ordem_compra (ordem_compra_id, produto_id, quantidade, custo_unitario_centavos) VALUES",
);
escrever(
  compras
    .flatMap((c) =>
      c.itens.map(
        (i) =>
          `  (${txt(c.id)}, ${txt(i.produtoId)}, ${i.quantidade}, ${cent(i.custoUnitario)})`,
      ),
    )
    .join(",\n") + ";",
);
escrever();

const maiorOrdem = Math.max(...compras.map((c) => Number(c.id.replace("OC-", ""))));
escrever(`SELECT setval('ordem_compra_numero_seq', ${maiorOrdem});`);
escrever();

// ---------------------------------------------------------------------------
// Livro de movimentação de estoque
// ---------------------------------------------------------------------------
// O mock guarda apenas o saldo ATUAL de cada produto — não existe rastro de
// como ele chegou lá. Aqui o livro é reconstruído para trás: partindo do saldo
// final conhecido e dos eventos que aconteceram (vendas e recebimentos),
// deduz-se o saldo de abertura. Assim `produto.estoque` deixa de ser um número
// solto e passa a ser conciliável, que é a correção nº 5 do prompt.
//
// Pedido cancelado NÃO move estoque — foi venda que não aconteceu.
escrever("-- Livro de movimentação de estoque --------------------------------------------");
escrever("-- Reconstruído a partir do saldo final conhecido e dos eventos dos 90 dias:");
escrever("--   saldo_abertura = saldo_final − Σ(entradas) + Σ(saídas)");
escrever("-- Assim SUM(quantidade) por produto reproduz exatamente produto.estoque.");
escrever("-- Pedido cancelado não move estoque: é venda que não aconteceu.");

type Evento = {
  data: string;
  tipo: "saida_venda" | "entrada_compra";
  delta: number;
  documentoTipo: string;
  documentoId: string;
  motivo: string;
};

const eventosPorProduto = new Map<string, Evento[]>();
const empurrar = (produtoId: string, e: Evento) => {
  const lista = eventosPorProduto.get(produtoId) ?? [];
  lista.push(e);
  eventosPorProduto.set(produtoId, lista);
};

for (const p of pedidosCronologicos) {
  if (p.status === "cancelado") continue;
  for (const i of p.itens) {
    empurrar(i.produtoId, {
      data: p.data,
      tipo: "saida_venda",
      delta: -i.quantidade,
      documentoTipo: "pedido",
      documentoId: p.id,
      motivo: `Venda ${p.id}`,
    });
  }
}

for (const c of compras) {
  if (c.status !== "recebida" || !c.recebidaEm) continue;
  for (const i of c.itens) {
    empurrar(i.produtoId, {
      data: c.recebidaEm,
      tipo: "entrada_compra",
      delta: i.quantidade,
      documentoTipo: "ordem_compra",
      documentoId: c.id,
      motivo: `Recebimento da ordem ${c.id}`,
    });
  }
}

// Um dia antes do primeiro pedido: é quando o estoque "passa a existir".
const dataAbertura = new Date(HOJE.getTime() - 91 * 86400000).toISOString();
const valoresMovimentacao: string[] = [];
const avisos: string[] = [];

for (const produto of PRODUTOS) {
  const eventos = (eventosPorProduto.get(produto.id) ?? []).sort(
    (a, b) =>
      a.data.localeCompare(b.data) ||
      a.documentoId.localeCompare(b.documentoId),
  );

  const somaEventos = eventos.reduce((s, e) => s + e.delta, 0);
  const abertura = produto.estoque - somaEventos;

  if (abertura < 0) {
    throw new Error(
      `Produto ${produto.id}: saldo de abertura negativo (${abertura}). ` +
        `Saldo final ${produto.estoque}, movimento líquido ${somaEventos}.`,
    );
  }

  let saldo = abertura;
  valoresMovimentacao.push(
    `  (${txt(produto.id)}, 'ajuste_inventario'::tipo_movimentacao, ${abertura}, 0, ${abertura}, ` +
      `${txt("abertura")}, NULL, ${txt("Saldo de abertura do inventário")}, ${ts(dataAbertura)})`,
  );

  for (const e of eventos) {
    const anterior = saldo;
    saldo += e.delta;
    if (saldo < 0) {
      avisos.push(
        `${produto.id} ficou negativo (${saldo}) em ${e.data} — ${e.motivo}`,
      );
    }
    valoresMovimentacao.push(
      `  (${txt(produto.id)}, ${txt(e.tipo)}::tipo_movimentacao, ${e.delta}, ${anterior}, ${saldo}, ` +
        `${txt(e.documentoTipo)}, ${txt(e.documentoId)}, ${txt(e.motivo)}, ${ts(e.data)})`,
    );
  }

  if (saldo !== produto.estoque) {
    throw new Error(
      `Produto ${produto.id}: livro fecha em ${saldo}, produto.estoque é ${produto.estoque}.`,
    );
  }
}

if (avisos.length) {
  // Saldo negativo no meio do caminho violaria o CHECK da tabela. Se acontecer,
  // é sinal de que o histórico e o saldo final do mock são incompatíveis.
  throw new Error(
    `Livro de estoque inconsistente:\n  ${avisos.join("\n  ")}`,
  );
}

escrever(
  "INSERT INTO movimentacao_estoque (produto_id, tipo, quantidade, saldo_anterior,",
);
escrever("  saldo_posterior, documento_tipo, documento_id, motivo, criado_em) VALUES");
escrever(valoresMovimentacao.join(",\n") + ";");
escrever();

// ---------------------------------------------------------------------------
// Conferência final embutida no próprio seed
// ---------------------------------------------------------------------------
escrever("-- Conferência ----------------------------------------------------------------");
escrever("-- Se o livro não fechar com o saldo, o seed falha aqui em vez de deixar o");
escrever("-- banco silenciosamente errado.");
escrever("DO $$");
escrever("DECLARE v_divergentes INT;");
escrever("BEGIN");
escrever("  SELECT COUNT(*) INTO v_divergentes FROM vw_conciliacao_estoque WHERE diferenca <> 0;");
escrever("  IF v_divergentes > 0 THEN");
escrever("    RAISE EXCEPTION 'Seed inconsistente: % produto(s) com saldo divergente do livro', v_divergentes;");
escrever("  END IF;");
escrever("END $$;");
escrever();
escrever("ANALYZE;");
escrever();

// ---------------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------------
const aqui = dirname(fileURLToPath(import.meta.url));
const destino = join(aqui, "001_seed.sql");
writeFileSync(destino, linhas.join("\n"), "utf8");

const itensTotais = pedidos.reduce((s, p) => s + p.itens.length, 0);
const cancelados = pedidos.filter((p) => p.status === "cancelado").length;

console.error(`Seed gerado em ${destino}`);
console.error(`  categorias .......... ${CATEGORIAS.length}`);
console.error(`  fornecedores ........ ${FORNECEDORES.length}`);
console.error(`  produtos ............ ${PRODUTOS.length}`);
console.error(`  clientes ............ ${nomesClientes.length}`);
console.error(`  pedidos ............. ${pedidos.length} (${cancelados} cancelados)`);
console.error(`  itens de pedido ..... ${itensTotais}`);
console.error(`  ordens de compra .... ${compras.length}`);
console.error(`  movimentações ....... ${valoresMovimentacao.length}`);
