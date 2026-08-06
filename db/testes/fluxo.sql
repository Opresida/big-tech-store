-- =============================================================================
-- Teste de fluxo ponta a ponta
-- =============================================================================
-- Repete no banco exatamente a verificação que o CONTEXT.md registra ter sido
-- feita à mão no front:
--
--   vender 3 DualSense  →  estoque 88 → 85, pedido aparece em vendas
--   receber a OC-2044   →  DualShock 4 de 5 → 65
--   ordem em rascunho   →  não move nada
--
-- RODE EM BRANCH DESCARTÁVEL: este arquivo altera dados.
--   psql "<url-da-branch>" -f testes/fluxo.sql
-- =============================================================================

\set ON_ERROR_STOP on
\timing off

\echo ''
\echo '=== 1. Estoque antes ==='
SELECT sku, nome, estoque, estoque_alvo, fn_nivel_estoque(estoque, estoque_alvo) AS nivel
  FROM produto WHERE id IN ('p03','p12','p17','p19') ORDER BY id;

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 2. Venda de 3 DualSense (p17) via fn_finalizar_pedido ==='
-- Repare no que NÃO é passado: preço, desconto, frete e total. Só a lista de
-- itens. O resto o banco calcula — é a correção nº 6 em funcionamento.
SELECT fn_finalizar_pedido(
  'Humberto de Assunção',
  'pix',
  '[{"produto_id": "p17", "quantidade": 3}]'::JSONB,
  'site'
) AS pedido_criado \gset

\echo 'Pedido criado:' :'pedido_criado'

SELECT id, cliente_nome, pagamento, status, canal,
       subtotal_centavos, desconto_centavos, frete_centavos, total_centavos,
       custo_total_centavos
  FROM pedido WHERE id = :'pedido_criado';

\echo '-- Conferência do dinheiro: 3 × R$ 379,00 = R$ 1.137,00; Pix −5% = R$ 1.080,15'
DO $$
DECLARE p RECORD;
BEGIN
  SELECT * INTO p FROM pedido ORDER BY criado_em DESC LIMIT 1;
  ASSERT p.subtotal_centavos = 113700, 'subtotal esperado 113700, veio ' || p.subtotal_centavos;
  ASSERT p.desconto_centavos = 5685,   'desconto esperado 5685, veio '   || p.desconto_centavos;
  ASSERT p.frete_centavos    = 0,      'frete esperado 0 (acima de R$ 299), veio ' || p.frete_centavos;
  ASSERT p.total_centavos    = 108015, 'total esperado 108015, veio '    || p.total_centavos;
  RAISE NOTICE 'Dinheiro do pedido confere.';
END $$;

\echo '-- Estoque do p17 e a linha do livro que explica a baixa'
SELECT sku, estoque FROM produto WHERE id = 'p17';
SELECT tipo, quantidade, saldo_anterior, saldo_posterior, documento_tipo, documento_id, motivo
  FROM movimentacao_estoque WHERE produto_id = 'p17'
 ORDER BY id DESC LIMIT 1;

DO $$
DECLARE v INT;
BEGIN
  SELECT estoque INTO v FROM produto WHERE id = 'p17';
  ASSERT v = 85, 'estoque do p17 deveria ser 85, veio ' || v;
  RAISE NOTICE 'Baixa de estoque confere: 88 -> 85.';
END $$;

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 3. Recebimento da OC-2044 (25 un. de p03 + 60 un. de p19) ==='
SELECT fn_receber_ordem_compra('OC-2044') AS unidades_recebidas;

SELECT sku, estoque FROM produto WHERE id IN ('p03','p19') ORDER BY id;
SELECT id, status, recebida_em IS NOT NULL AS tem_data FROM ordem_compra WHERE id = 'OC-2044';

DO $$
DECLARE v03 INT; v19 INT;
BEGIN
  SELECT estoque INTO v03 FROM produto WHERE id = 'p03';
  SELECT estoque INTO v19 FROM produto WHERE id = 'p19';
  ASSERT v03 = 31, 'p03 deveria ir de 6 para 31, veio ' || v03;
  ASSERT v19 = 65, 'p19 deveria ir de 5 para 65, veio ' || v19;
  RAISE NOTICE 'Entrada por compra confere: p03 6 -> 31, p19 5 -> 65.';
END $$;

\echo '-- O DualShock 4 sai de crítico e volta a saudável — é o alerta sumindo da loja'
SELECT sku, estoque, estoque_alvo, fn_nivel_estoque(estoque, estoque_alvo) AS nivel
  FROM produto WHERE id = 'p19';

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 4. Receber a mesma ordem duas vezes tem de falhar ==='
DO $$
BEGIN
  PERFORM fn_receber_ordem_compra('OC-2044');
  RAISE EXCEPTION 'FALHOU: recebimento em duplicidade foi aceito';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Recusado corretamente: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 5. Ordem em rascunho (OC-2045) não move estoque ==='
-- A OC-2045 pede 30 unidades do Lenovo (p12), que está esgotado. Enquanto for
-- rascunho, o estoque tem de continuar zerado.
SELECT o.id, o.status, i.produto_id, i.quantidade
  FROM ordem_compra o JOIN item_ordem_compra i ON i.ordem_compra_id = o.id
 WHERE o.id = 'OC-2045';

DO $$
DECLARE v INT;
BEGIN
  SELECT estoque INTO v FROM produto WHERE id = 'p12';
  ASSERT v = 0, 'p12 deveria seguir esgotado (0), veio ' || v;
  RAISE NOTICE 'Rascunho não moveu estoque: p12 segue em 0.';
END $$;

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 6. Venda acima do saldo tem de falhar ==='
DO $$
BEGIN
  PERFORM fn_finalizar_pedido(
    'Comprador Ganancioso', 'pix',
    '[{"produto_id": "p12", "quantidade": 1}]'::JSONB, 'site');
  RAISE EXCEPTION 'FALHOU: venda de produto esgotado foi aceita';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'Recusado corretamente: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== 7. Conciliação do livro depois de tudo (tem de vir vazio) ==='
SELECT * FROM vw_conciliacao_estoque WHERE diferenca <> 0;

\echo ''
\echo '=== 8. Trilha de auditoria gerada pelas operações acima ==='
SELECT tabela, registro_id, campo, valor_anterior, valor_novo
  FROM auditoria ORDER BY id;

\echo ''
\echo '=== 9. Contas a pagar: a OC-2044 saiu, a OC-2045 continua ==='
SELECT ordem_compra_id, fornecedor, status, previsao, total_centavos FROM vw_contas_a_pagar;
