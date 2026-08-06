-- =============================================================================
-- 009 — Consultas da área de gestão
-- =============================================================================
-- Cada função aqui é a versão em SQL de uma função de `src/lib/metricas.ts`.
-- Esse arquivo é a especificação real do painel — mais preciso que qualquer
-- descrição em prosa —, então as fórmulas foram copiadas dele, inclusive as
-- decisões que pareceriam estranhas fora de contexto.
--
-- Três regras valem para tudo:
--   1. Pedido CANCELADO não entra em nada. O filtro está aqui dentro, nunca na
--      chamada — quem esquecer de filtrar não tem como errar.
--   2. A janela é ROLANTE, não calendário: "7 dias" é `ref - 7 dias` até `ref`,
--      exatamente como `noPeriodo()` faz. O período anterior é a janela
--      imediatamente antes, de mesmo tamanho.
--   3. O dia civil é o de São Paulo, não o UTC — ver fn_fuso_operacao().
--
-- ATENÇÃO a uma inconsistência herdada do front, reproduzida aqui de propósito
-- para que os números batam: existem DUAS receitas no painel.
--   • receita LÍQUIDA (`pedido.total_centavos`) — já com o desconto do Pix.
--     Usada em resumo, série diária, série mensal e formas de pagamento.
--   • receita BRUTA dos itens (Σ preço × quantidade) — SEM o desconto do Pix.
--     Usada no ranking e na receita por categoria.
-- Por isso "receita por categoria" soma mais que "receita do período". Está
-- assim no front hoje; unificar é decisão de negócio, não de banco.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- fn_agora — a referência temporal
-- -----------------------------------------------------------------------------
-- Espelha `agora()`: o maior entre o relógio real e a data do pedido mais
-- recente. Sem isso, um banco semeado com histórico "no futuro" mostraria
-- janelas vazias.
CREATE OR REPLACE FUNCTION fn_agora()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(now(), COALESCE((SELECT MAX(data) FROM pedido), now()));
$$;

-- -----------------------------------------------------------------------------
-- fn_variacao — variação percentual contra o período anterior
-- -----------------------------------------------------------------------------
-- Regra do front: sem base anterior, cresceu 100% se houve algo agora, e 0% se
-- não houve nada. Evita divisão por zero e evita "∞%" na tela.
CREATE OR REPLACE FUNCTION fn_variacao(p_atual NUMERIC, p_anterior NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_anterior, 0) = 0 THEN CASE WHEN COALESCE(p_atual, 0) <> 0 THEN 100 ELSE 0 END
    ELSE (p_atual - p_anterior) / p_anterior * 100
  END;
$$;

-- -----------------------------------------------------------------------------
-- fn_resumo_periodo — os KPIs de uma janela
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_resumo_periodo(
  p_dias INT,
  p_ref  TIMESTAMPTZ DEFAULT NULL,
  p_deslocamento INT DEFAULT 0   -- 0 = janela atual, 1 = janela anterior
)
RETURNS TABLE (
  receita_centavos    BIGINT,
  custo_centavos      BIGINT,
  margem_centavos     BIGINT,
  margem_percentual   NUMERIC,
  pedidos             BIGINT,
  itens               BIGINT,
  ticket_medio_centavos NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH ref AS (
    SELECT COALESCE(p_ref, fn_agora()) AS t
  ),
  janela AS (
    SELECT
      (SELECT t FROM ref) - make_interval(days => p_dias * (p_deslocamento + 1)) AS inicio,
      CASE WHEN p_deslocamento = 0
           THEN NULL::TIMESTAMPTZ                                  -- sem teto: igual a noPeriodo()
           ELSE (SELECT t FROM ref) - make_interval(days => p_dias * p_deslocamento)
      END AS fim
  ),
  validos AS (
    SELECT p.*
      FROM pedido p, janela j
     WHERE p.status <> 'cancelado'
       AND p.data >= j.inicio
       AND (j.fim IS NULL OR p.data < j.fim)
  ),
  agregado AS (
    SELECT
      COALESCE(SUM(v.total_centavos), 0)::BIGINT       AS receita,
      COALESCE(SUM(v.custo_total_centavos), 0)::BIGINT AS custo,
      COUNT(*)::BIGINT                                  AS qtd_pedidos,
      COALESCE((
        SELECT SUM(i.quantidade) FROM item_pedido i
         WHERE i.pedido_id IN (SELECT id FROM validos)
      ), 0)::BIGINT                                     AS qtd_itens
    FROM validos v
  )
  SELECT
    a.receita,
    a.custo,
    (a.receita - a.custo)::BIGINT,
    CASE WHEN a.receita <> 0
         THEN (a.receita - a.custo)::NUMERIC / a.receita * 100
         ELSE 0 END,
    a.qtd_pedidos,
    a.qtd_itens,
    CASE WHEN a.qtd_pedidos <> 0
         THEN a.receita::NUMERIC / a.qtd_pedidos
         ELSE 0 END
  FROM agregado a;
$$;

COMMENT ON FUNCTION fn_resumo_periodo IS
  'Espelha resumo() de metricas.ts. p_deslocamento=1 devolve o período '
  'imediatamente anterior, de mesmo tamanho. Exemplo: '
  'SELECT * FROM fn_resumo_periodo(30);';

-- -----------------------------------------------------------------------------
-- fn_resumo_comparado — KPI com variação, do jeito que o painel mostra
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_resumo_comparado(
  p_dias INT,
  p_ref  TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  metrica           TEXT,
  atual             NUMERIC,
  anterior          NUMERIC,
  variacao_percentual NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH a AS (SELECT * FROM fn_resumo_periodo(p_dias, p_ref, 0)),
       b AS (SELECT * FROM fn_resumo_periodo(p_dias, p_ref, 1))
  SELECT m.metrica, m.atual, m.anterior, fn_variacao(m.atual, m.anterior)
  FROM a, b,
  LATERAL (VALUES
    ('receita_centavos',      a.receita_centavos::NUMERIC,      b.receita_centavos::NUMERIC),
    ('custo_centavos',        a.custo_centavos::NUMERIC,        b.custo_centavos::NUMERIC),
    ('margem_centavos',       a.margem_centavos::NUMERIC,       b.margem_centavos::NUMERIC),
    ('margem_percentual',     a.margem_percentual,              b.margem_percentual),
    ('pedidos',               a.pedidos::NUMERIC,               b.pedidos::NUMERIC),
    ('itens',                 a.itens::NUMERIC,                 b.itens::NUMERIC),
    ('ticket_medio_centavos', a.ticket_medio_centavos,          b.ticket_medio_centavos)
  ) AS m(metrica, atual, anterior);
$$;

-- -----------------------------------------------------------------------------
-- fn_ranking_produtos — o Top 5 do Analytics
-- -----------------------------------------------------------------------------
-- Ordena por UNIDADES vendidas (não por receita) e traz a posição no período
-- anterior, que é o que permite a seta de "subiu 2 posições".
--
-- Produto que não vendeu no período anterior vem com posicao_anterior NULL —
-- é estreia, não queda.
CREATE OR REPLACE FUNCTION fn_ranking_produtos(
  p_dias INT,
  p_ref  TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  posicao            BIGINT,
  posicao_anterior   BIGINT,
  variacao_posicao   BIGINT,
  produto_id         TEXT,
  sku                TEXT,
  nome               TEXT,
  categoria          TEXT,
  unidades           BIGINT,
  receita_centavos   BIGINT,
  margem_centavos    BIGINT,
  margem_percentual  NUMERIC,
  share_unidades     NUMERIC,
  pedidos            BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH r AS (SELECT COALESCE(p_ref, fn_agora()) AS t),
  atual AS (
    SELECT
      i.produto_id,
      SUM(i.quantidade)::BIGINT AS unidades,
      SUM(i.preco_unitario_centavos * i.quantidade)::BIGINT AS receita,
      SUM((i.preco_unitario_centavos - i.custo_unitario_centavos) * i.quantidade)::BIGINT AS margem,
      COUNT(DISTINCT i.pedido_id)::BIGINT AS pedidos
    FROM item_pedido i
    JOIN pedido p ON p.id = i.pedido_id
    WHERE p.status <> 'cancelado'
      AND p.data >= (SELECT t FROM r) - make_interval(days => p_dias)
    GROUP BY i.produto_id
  ),
  anterior AS (
    SELECT
      i.produto_id,
      SUM(i.quantidade)::BIGINT AS unidades,
      SUM(i.preco_unitario_centavos * i.quantidade)::BIGINT AS receita
    FROM item_pedido i
    JOIN pedido p ON p.id = i.pedido_id
    WHERE p.status <> 'cancelado'
      AND p.data >= (SELECT t FROM r) - make_interval(days => p_dias * 2)
      AND p.data <  (SELECT t FROM r) - make_interval(days => p_dias)
    GROUP BY i.produto_id
  ),
  -- Desempate determinístico: unidades, depois receita, depois id. O front
  -- ordena só por unidades e depende da estabilidade do sort do JavaScript —
  -- em SQL isso não existe, e sem desempate a posição oscilaria entre
  -- execuções.
  pos_atual AS (
    SELECT a.*,
           ROW_NUMBER() OVER (ORDER BY a.unidades DESC, a.receita DESC, a.produto_id) AS posicao,
           SUM(a.unidades) OVER () AS total_unidades
    FROM atual a
  ),
  pos_anterior AS (
    SELECT b.produto_id,
           ROW_NUMBER() OVER (ORDER BY b.unidades DESC, b.receita DESC, b.produto_id) AS posicao
    FROM anterior b
  )
  SELECT
    pa.posicao,
    pb.posicao,
    (pb.posicao - pa.posicao),          -- positivo = subiu no ranking
    pa.produto_id,
    pr.sku,
    pr.nome,
    c.nome,
    pa.unidades,
    pa.receita,
    pa.margem,
    CASE WHEN pa.receita <> 0 THEN pa.margem::NUMERIC / pa.receita * 100 ELSE 0 END,
    CASE WHEN pa.total_unidades <> 0
         THEN pa.unidades::NUMERIC / pa.total_unidades * 100 ELSE 0 END,
    pa.pedidos
  FROM pos_atual pa
  JOIN produto pr  ON pr.id = pa.produto_id
  JOIN categoria c ON c.id = pr.categoria_id
  LEFT JOIN pos_anterior pb ON pb.produto_id = pa.produto_id
  ORDER BY pa.posicao;
$$;

COMMENT ON FUNCTION fn_ranking_produtos IS
  'Espelha ranking() de metricas.ts. receita_centavos é BRUTA (Σ preço × qtd), '
  'sem o desconto do Pix — igual ao front. Top 5: LIMIT 5.';

-- -----------------------------------------------------------------------------
-- fn_receita_por_categoria
-- -----------------------------------------------------------------------------
-- Escala sequencial de um tom só na tela, não cinco cores: a identidade já está
-- no rótulo da linha (ver CONTEXT.md). Aqui só sai o número.
CREATE OR REPLACE FUNCTION fn_receita_por_categoria(
  p_dias INT,
  p_ref  TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  categoria_id     TEXT,
  categoria        TEXT,
  valor_centavos   BIGINT,
  percentual       NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH r AS (SELECT COALESCE(p_ref, fn_agora()) AS t),
  base AS (
    SELECT pr.categoria_id,
           SUM(i.preco_unitario_centavos * i.quantidade)::BIGINT AS valor
    FROM item_pedido i
    JOIN pedido  p  ON p.id = i.pedido_id
    JOIN produto pr ON pr.id = i.produto_id
    WHERE p.status <> 'cancelado'
      AND p.data >= (SELECT t FROM r) - make_interval(days => p_dias)
    GROUP BY pr.categoria_id
  )
  SELECT b.categoria_id, c.nome, b.valor,
         CASE WHEN SUM(b.valor) OVER () <> 0
              THEN b.valor::NUMERIC / SUM(b.valor) OVER () * 100 ELSE 0 END
  FROM base b
  JOIN categoria c ON c.id = b.categoria_id
  ORDER BY b.valor DESC;
$$;

-- -----------------------------------------------------------------------------
-- fn_por_forma_pagamento
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_por_forma_pagamento(
  p_dias INT,
  p_ref  TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  pagamento       forma_pagamento,
  rotulo          TEXT,
  valor_centavos  BIGINT,
  quantidade      BIGINT,
  percentual      NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH r AS (SELECT COALESCE(p_ref, fn_agora()) AS t),
  base AS (
    SELECT p.pagamento,
           SUM(p.total_centavos)::BIGINT AS valor,
           COUNT(*)::BIGINT AS qtd
    FROM pedido p
    WHERE p.status <> 'cancelado'
      AND p.data >= (SELECT t FROM r) - make_interval(days => p_dias)
    GROUP BY p.pagamento
  )
  SELECT b.pagamento,
         CASE b.pagamento
           WHEN 'pix'     THEN 'Pix'
           WHEN 'credito' THEN 'Crédito'
           WHEN 'boleto'  THEN 'Boleto'
         END,
         b.valor, b.qtd,
         CASE WHEN SUM(b.valor) OVER () <> 0
              THEN b.valor::NUMERIC / SUM(b.valor) OVER () * 100 ELSE 0 END
  FROM base b
  ORDER BY b.valor DESC;
$$;

-- -----------------------------------------------------------------------------
-- fn_serie_diaria
-- -----------------------------------------------------------------------------
-- Um ponto por dia, com os dias sem venda em ZERO. Dia que some do gráfico
-- mente sobre o formato da curva — por isso o generate_series à esquerda em
-- vez de um GROUP BY seco.
CREATE OR REPLACE FUNCTION fn_serie_diaria(
  p_dias INT,
  p_ref  TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  dia              DATE,
  rotulo           TEXT,
  receita_centavos BIGINT,
  pedidos          BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH r AS (
    SELECT (COALESCE(p_ref, fn_agora()) AT TIME ZONE fn_fuso_operacao())::DATE AS d_fim
  ),
  dias AS (
    SELECT generate_series((SELECT d_fim FROM r) - (p_dias - 1), (SELECT d_fim FROM r), '1 day')::DATE AS dia
  ),
  vendas AS (
    SELECT (p.data AT TIME ZONE fn_fuso_operacao())::DATE AS dia,
           SUM(p.total_centavos)::BIGINT AS receita,
           COUNT(*)::BIGINT AS pedidos
    FROM pedido p
    WHERE p.status <> 'cancelado'
      AND (p.data AT TIME ZONE fn_fuso_operacao())::DATE
          BETWEEN (SELECT d_fim FROM r) - (p_dias - 1) AND (SELECT d_fim FROM r)
    GROUP BY 1
  )
  SELECT d.dia,
         to_char(d.dia, 'DD/MM'),
         COALESCE(v.receita, 0)::BIGINT,
         COALESCE(v.pedidos, 0)::BIGINT
  FROM dias d
  LEFT JOIN vendas v ON v.dia = d.dia
  ORDER BY d.dia;
$$;

-- -----------------------------------------------------------------------------
-- fn_serie_mensal
-- -----------------------------------------------------------------------------
-- O mês corrente é parcial de propósito — é o mês em andamento, não uma falha.
CREATE OR REPLACE FUNCTION fn_serie_mensal(
  p_meses INT,
  p_ref   TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  mes              DATE,
  rotulo           TEXT,
  receita_centavos BIGINT,
  custo_centavos   BIGINT,
  margem_centavos  BIGINT,
  pedidos          BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH r AS (
    SELECT date_trunc('month', COALESCE(p_ref, fn_agora()) AT TIME ZONE fn_fuso_operacao())::DATE AS m_fim
  ),
  meses AS (
    SELECT generate_series(
             (SELECT m_fim FROM r) - make_interval(months => p_meses - 1),
             (SELECT m_fim FROM r),
             '1 month'
           )::DATE AS mes
  ),
  vendas AS (
    SELECT date_trunc('month', p.data AT TIME ZONE fn_fuso_operacao())::DATE AS mes,
           SUM(p.total_centavos)::BIGINT       AS receita,
           SUM(p.custo_total_centavos)::BIGINT AS custo,
           COUNT(*)::BIGINT                    AS pedidos
    FROM pedido p
    WHERE p.status <> 'cancelado'
    GROUP BY 1
  )
  SELECT m.mes,
         -- Rótulo curto em pt-BR, igual ao MESES_CURTOS do front: "ago/26".
         (ARRAY['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'])
           [EXTRACT(MONTH FROM m.mes)::INT] || '/' || to_char(m.mes, 'YY'),
         COALESCE(v.receita, 0)::BIGINT,
         COALESCE(v.custo, 0)::BIGINT,
         (COALESCE(v.receita, 0) - COALESCE(v.custo, 0))::BIGINT,
         COALESCE(v.pedidos, 0)::BIGINT
  FROM meses m
  LEFT JOIN vendas v ON v.mes = m.mes
  ORDER BY m.mes;
$$;

-- -----------------------------------------------------------------------------
-- fn_cobertura — a consulta mais importante da área de vendas
-- -----------------------------------------------------------------------------
-- Responde "o que acaba primeiro?" antes de esgotar. Menos de 7 dias de
-- cobertura é crítico; menos de 21, alerta.
--
-- `dias_cobertura` NULL significa "não vendeu nada na janela" — no front isso é
-- Infinity e vai para o fim da lista. NULL ordenado por último faz o mesmo, e é
-- mais honesto que fingir um número gigante.
CREATE OR REPLACE FUNCTION fn_cobertura(
  p_janela INT DEFAULT 30,
  p_ref    TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  produto_id       TEXT,
  sku              TEXT,
  nome             TEXT,
  categoria        TEXT,
  estoque          INT,
  estoque_alvo     INT,
  nivel            TEXT,
  vendidos         BIGINT,
  media_diaria     NUMERIC,
  dias_cobertura   NUMERIC,
  sugestao_compra  INT,
  receita_parada_centavos BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH r AS (SELECT COALESCE(p_ref, fn_agora()) AS t),
  vendas AS (
    SELECT i.produto_id, SUM(i.quantidade)::BIGINT AS vendidos
    FROM item_pedido i
    JOIN pedido p ON p.id = i.pedido_id
    WHERE p.status <> 'cancelado'
      AND p.data >= (SELECT t FROM r) - make_interval(days => p_janela)
    GROUP BY i.produto_id
  ),
  base AS (
    SELECT
      pr.id, pr.sku, pr.nome, c.nome AS categoria, pr.estoque, pr.estoque_alvo,
      pr.preco_centavos,
      COALESCE(v.vendidos, 0)::BIGINT AS vendidos,
      COALESCE(v.vendidos, 0)::NUMERIC / p_janela AS media_diaria
    FROM produto pr
    JOIN categoria c ON c.id = pr.categoria_id
    LEFT JOIN vendas v ON v.produto_id = pr.id
    WHERE pr.status = 'ativo'
  )
  SELECT
    b.id, b.sku, b.nome, b.categoria, b.estoque, b.estoque_alvo,
    fn_nivel_estoque(b.estoque, b.estoque_alvo),
    b.vendidos,
    b.media_diaria,
    CASE WHEN b.media_diaria > 0 THEN b.estoque / b.media_diaria END,
    -- Repor para 45 dias de giro, nunca abaixo do estoque-alvo.
    GREATEST(0, GREATEST(CEIL(b.media_diaria * 45)::INT, b.estoque_alvo) - b.estoque),
    -- Quanto de receita está parado na prateleira deste SKU.
    (b.estoque::BIGINT * b.preco_centavos)::BIGINT
  FROM base b
  ORDER BY CASE WHEN b.media_diaria > 0 THEN b.estoque / b.media_diaria END
             ASC NULLS LAST,
           b.sku;
$$;

-- -----------------------------------------------------------------------------
-- Views de apoio
-- -----------------------------------------------------------------------------

-- Nível de estoque por produto — a mesma regra que a loja usa na badge.
CREATE OR REPLACE VIEW vw_nivel_estoque AS
SELECT
  p.id AS produto_id, p.sku, p.nome, p.marca,
  c.id AS categoria_id, c.nome AS categoria,
  p.estoque, p.estoque_alvo,
  fn_nivel_estoque(p.estoque, p.estoque_alvo) AS nivel,
  LEAST(100, ROUND(p.estoque::NUMERIC / GREATEST(p.estoque_alvo, 1) * 100))::INT AS percentual,
  p.status
FROM produto p
JOIN categoria c ON c.id = p.categoria_id;

-- Capital imobilizado (a custo) e potencial de receita (a preço de venda).
CREATE OR REPLACE VIEW vw_valor_estoque AS
SELECT
  COALESCE(SUM(p.estoque::BIGINT * p.custo_centavos), 0)::BIGINT AS valor_a_custo_centavos,
  COALESCE(SUM(p.estoque::BIGINT * p.preco_centavos), 0)::BIGINT AS valor_a_venda_centavos,
  COALESCE(SUM(p.estoque), 0)::BIGINT                            AS unidades
FROM produto p
WHERE p.status = 'ativo';

-- Contas a pagar: ordem de compra que ainda não foi recebida. A mercadoria
-- pode não ter chegado, mas o compromisso já existe.
CREATE OR REPLACE VIEW vw_contas_a_pagar AS
SELECT
  o.id AS ordem_compra_id,
  f.nome AS fornecedor,
  o.data AS emitida_em,
  o.previsao,
  o.status,
  o.total_centavos,
  (o.previsao < CURRENT_DATE) AS atrasada,
  (o.previsao - CURRENT_DATE) AS dias_para_previsao
FROM ordem_compra o
JOIN fornecedor f ON f.id = o.fornecedor_id
WHERE o.status <> 'recebida'
ORDER BY o.previsao;

INSERT INTO migracao (versao, descricao) VALUES
  ('009', 'Funções e views da área de gestão')
ON CONFLICT (versao) DO NOTHING;
