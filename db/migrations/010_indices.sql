-- =============================================================================
-- 010 — Índices
-- =============================================================================
-- As telas do painel cruzam 90 dias de pedidos com 20+ SKUs a cada
-- carregamento, e todas as funções da migration 009 filtram por
-- `pedido.data >= alguma coisa` com `status <> 'cancelado'`. Sem índice, isso
-- é sequential scan em toda abertura de tela.
--
-- PK e UNIQUE já criam índice sozinhos — produto.slug, produto.sku,
-- cliente.email, cliente.cpf, fornecedor.nome e item_pedido(pedido_id,
-- produto_id) não aparecem aqui porque já estão cobertos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- pedido
-- -----------------------------------------------------------------------------
-- DESC porque toda tela quer "os mais recentes primeiro".
CREATE INDEX ix_pedido_data ON pedido (data DESC);

-- Índice parcial: 93% dos pedidos são válidos, e é sempre esse recorte que as
-- funções varrem. Menor que o índice cheio e já entrega a ordenação por data.
CREATE INDEX ix_pedido_validos_data ON pedido (data DESC)
  WHERE status <> 'cancelado';

CREATE INDEX ix_pedido_status    ON pedido (status);
CREATE INDEX ix_pedido_pagamento ON pedido (pagamento);
CREATE INDEX ix_pedido_cliente   ON pedido (cliente_id) WHERE cliente_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- item_pedido
-- -----------------------------------------------------------------------------
-- Ranking, cobertura e receita por categoria agrupam por produto.
CREATE INDEX ix_item_pedido_produto ON item_pedido (produto_id);
-- INCLUDE evita voltar à tabela para somar: o índice já carrega a quantidade.
CREATE INDEX ix_item_pedido_pedido  ON item_pedido (pedido_id) INCLUDE (produto_id, quantidade);

-- -----------------------------------------------------------------------------
-- produto
-- -----------------------------------------------------------------------------
CREATE INDEX ix_produto_categoria  ON produto (categoria_id);
CREATE INDEX ix_produto_fornecedor ON produto (fornecedor_id);
CREATE INDEX ix_produto_ativos     ON produto (id) WHERE status = 'ativo';

-- Busca da vitrine e do painel: nome, marca e SKU, sem diferenciar acento nem
-- caixa. pg_trgm faz `LIKE '%galaxy%'` usar índice em vez de varrer a tabela.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE INDEX ix_produto_busca_trgm
  ON produto USING GIN (
    (lower(nome) || ' ' || lower(marca) || ' ' || lower(sku)) gin_trgm_ops
  );

-- -----------------------------------------------------------------------------
-- movimentacao_estoque
-- -----------------------------------------------------------------------------
-- O par (produto, tempo) é exatamente como o extrato de um SKU é lido.
CREATE INDEX ix_movimentacao_produto_data ON movimentacao_estoque (produto_id, criado_em DESC);
CREATE INDEX ix_movimentacao_documento    ON movimentacao_estoque (documento_tipo, documento_id);
CREATE INDEX ix_movimentacao_tipo_data    ON movimentacao_estoque (tipo, criado_em DESC);

-- -----------------------------------------------------------------------------
-- compras
-- -----------------------------------------------------------------------------
CREATE INDEX ix_ordem_compra_status     ON ordem_compra (status);
CREATE INDEX ix_ordem_compra_fornecedor ON ordem_compra (fornecedor_id);
-- Contas a pagar: só interessam as não recebidas, ordenadas por vencimento.
CREATE INDEX ix_ordem_compra_a_pagar    ON ordem_compra (previsao)
  WHERE status <> 'recebida';
CREATE INDEX ix_item_ordem_compra_produto ON item_ordem_compra (produto_id);

INSERT INTO migracao (versao, descricao) VALUES
  ('010', 'Índices de leitura do painel e da vitrine')
ON CONFLICT (versao) DO NOTHING;
