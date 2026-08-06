-- =============================================================================
-- 011 — Ajustes vindos da revisão do esquema contra o front
-- =============================================================================
-- Esta migration não estava no plano original: nasceu da revisão tela a tela
-- (ver REVISAO-FRONT.md). Dois pontos em que o esquema não servia o que a
-- vitrine JÁ faz hoje.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Desconto percentual — usado pela home e pelo catálogo
-- -----------------------------------------------------------------------------
-- `descontoPercentual()` (src/lib/formato.ts) aparece em três lugares:
--   • home, para escolher as 4 "Ofertas do dia" (maior desconto primeiro);
--   • catálogo, no filtro `?ofertas=1` (corta em 15%) e na ordenação
--     "Maior desconto";
--   • badge "-XX% OFF" do card e do hero.
--
-- Calcular isso em toda consulta é repetir a regra de arredondamento em N
-- lugares — e é exatamente assim que a vitrine e o painel passam a discordar
-- sobre o mesmo produto. Coluna gerada resolve de uma vez e ainda dá para
-- indexar.
ALTER TABLE produto
  ADD COLUMN desconto_percentual INT
  GENERATED ALWAYS AS (
    CASE
      WHEN preco_de_centavos <= preco_centavos THEN 0
      ELSE ROUND((preco_de_centavos - preco_centavos)::NUMERIC
                 / preco_de_centavos * 100)::INT
    END
  ) STORED;

COMMENT ON COLUMN produto.desconto_percentual IS
  'Espelha descontoPercentual(precoDe, preco) do front, com o mesmo '
  'arredondamento. Coluna gerada: não pode divergir do preço.';

-- O filtro de ofertas corta em 15%; o índice parcial cobre exatamente ele.
CREATE INDEX ix_produto_ofertas ON produto (desconto_percentual DESC)
  WHERE status = 'ativo' AND desconto_percentual >= 15;

-- -----------------------------------------------------------------------------
-- 2. Índice de busca com a superfície REAL da vitrine
-- -----------------------------------------------------------------------------
-- O índice da migration 010 cobria nome + marca + sku. Mas o catálogo monta o
-- alvo da busca assim (src/app/(loja)/produtos/page.tsx):
--
--   `${p.nome} ${p.marca} ${p.sku} ${p.resumo} ${p.categoria}`.toLowerCase()
--
-- Faltavam `resumo` e a categoria. Quem procurasse "consoles" ou uma palavra da
-- descrição acharia no front e não acharia pelo banco — divergência silenciosa,
-- do pior tipo: a busca não dá erro, só devolve menos.
--
-- Sem unaccent de propósito: o front compara com `toLowerCase()` apenas, então
-- "audio" não encontra "Áudio" hoje. A extensão está instalada e pronta, mas
-- ligá-la aqui faria o banco achar o que a tela não acha. É melhoria a fazer
-- nas duas pontas ao mesmo tempo.
DROP INDEX IF EXISTS ix_produto_busca_trgm;

CREATE INDEX ix_produto_busca_trgm
  ON produto USING GIN (
    (lower(nome || ' ' || marca || ' ' || sku || ' ' || resumo || ' ' || categoria_id))
    gin_trgm_ops
  );

COMMENT ON INDEX ix_produto_busca_trgm IS
  'Mesma concatenação que o catálogo usa para buscar. Consulta equivalente: '
  'WHERE lower(nome||'' ''||marca||'' ''||sku||'' ''||resumo||'' ''||categoria_id) LIKE ''%termo%''';

-- -----------------------------------------------------------------------------
-- 3. Unidades vendidas por produto na janela — usada na loja E no painel
-- -----------------------------------------------------------------------------
-- Home ("5 mais vendidos"), catálogo (ordenação por giro e "relevância"),
-- página do produto e checkout direto (<ProvaSocial vendidos30>) precisam do
-- mesmo número: quantas unidades daquele SKU saíram na janela.
--
-- fn_cobertura() já devolve isso, mas junto com sugestão de compra e cobertura
-- em dias — peso desnecessário para a vitrine. Esta é a versão enxuta, e
-- devolve TODOS os produtos ativos, inclusive os que não venderam (zero), que
-- é o que a ordenação precisa para não perder item.
CREATE OR REPLACE FUNCTION fn_vendidos_por_produto(
  p_dias INT DEFAULT 30,
  p_ref  TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (produto_id TEXT, unidades BIGINT)
LANGUAGE sql
STABLE
AS $$
  -- O filtro de pedido vive numa CTE, não no ON de um LEFT JOIN. Posto no ON,
  -- o item de um pedido cancelado continuaria na soma (o LEFT JOIN preserva a
  -- linha de item e só anula as colunas do pedido) — soma inflada, sem erro.
  WITH r AS (SELECT COALESCE(p_ref, fn_agora()) AS t),
  vendas AS (
    SELECT i.produto_id, SUM(i.quantidade)::BIGINT AS unidades
      FROM item_pedido i
      JOIN pedido p ON p.id = i.pedido_id
     WHERE p.status <> 'cancelado'
       AND p.data >= (SELECT t FROM r) - make_interval(days => p_dias)
     GROUP BY i.produto_id
  )
  SELECT pr.id, COALESCE(v.unidades, 0)::BIGINT
    FROM produto pr
    LEFT JOIN vendas v ON v.produto_id = pr.id
   WHERE pr.status = 'ativo';
$$;

COMMENT ON FUNCTION fn_vendidos_por_produto IS
  'Unidades vendidas por produto na janela, incluindo os que venderam zero. '
  'Base da ordenação "mais vendidos" do catálogo e do <ProvaSocial> da loja.';

INSERT INTO migracao (versao, descricao) VALUES
  ('011', 'Ajustes da revisão contra o front: desconto, busca e giro por produto')
ON CONFLICT (versao) DO NOTHING;
