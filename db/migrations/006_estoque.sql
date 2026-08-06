-- =============================================================================
-- 006 — Livro de movimentação de estoque
-- =============================================================================
-- Correção 5 do prompt, e a mais importante de todas.
--
-- Hoje `produto.estoque` é um número que alguém soma e subtrai, sem rastro: o
-- painel mostra 42 unidades e ninguém consegue responder "42 por quê?". A
-- partir daqui o saldo é CONSEQUÊNCIA de um livro — toda alteração tem tipo,
-- quantidade com sinal, saldo antes, saldo depois, documento de origem, autor
-- e horário.
--
-- Regra de ouro: nenhum UPDATE direto em `produto.estoque`. Sempre por
-- fn_registrar_movimentacao(), que escreve a linha do livro e o saldo na mesma
-- transação. Se as duas coisas não acontecerem juntas, o estoque mente.
-- =============================================================================

CREATE TABLE movimentacao_estoque (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  produto_id      TEXT NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
  tipo            tipo_movimentacao NOT NULL,

  -- Com sinal: positivo entra, negativo sai. Somar a coluna inteira de um
  -- produto tem de dar exatamente o saldo dele — é o teste de conciliação.
  quantidade      INT NOT NULL,
  saldo_anterior  INT NOT NULL,
  saldo_posterior INT NOT NULL,

  -- De onde veio: 'pedido' + BTS-1234, 'ordem_compra' + OC-2044, ou nulo
  -- quando é acerto manual de inventário.
  documento_tipo  TEXT,
  documento_id    TEXT,
  motivo          TEXT,

  -- Quem fez. Nulo para o que veio do seed e para venda da loja (o cliente não
  -- é usuário do painel). A FK entra na migration 007, quando usuario_admin
  -- existir.
  usuario_id      UUID,

  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT movimentacao_quantidade_nao_zero CHECK (quantidade <> 0),
  CONSTRAINT movimentacao_saldos_nao_negativos
    CHECK (saldo_anterior >= 0 AND saldo_posterior >= 0),
  -- A aritmética do próprio lançamento tem de fechar.
  CONSTRAINT movimentacao_saldo_fecha
    CHECK (saldo_posterior = saldo_anterior + quantidade),
  -- Sentido coerente com o tipo: compra e devolução entram, venda sai.
  -- Ajuste de inventário pode ir para os dois lados.
  CONSTRAINT movimentacao_sentido_coerente CHECK (
    (tipo = 'entrada_compra'    AND quantidade > 0) OR
    (tipo = 'devolucao'         AND quantidade > 0) OR
    (tipo = 'saida_venda'       AND quantidade < 0) OR
    (tipo = 'ajuste_inventario')
  )
);

COMMENT ON TABLE movimentacao_estoque IS
  'Livro-razão do estoque. O saldo em produto.estoque é derivado daqui e tem '
  'de ser conciliável: SUM(quantidade) por produto = produto.estoque.';

-- -----------------------------------------------------------------------------
-- fn_registrar_movimentacao — a ÚNICA porta de entrada do saldo
-- -----------------------------------------------------------------------------
-- O SELECT ... FOR UPDATE serializa quem mexe no mesmo produto. Duas vendas
-- simultâneas da última unidade viram fila: a primeira baixa, a segunda vê o
-- saldo já atualizado e é recusada. Sem isso, as duas leriam 1 e as duas
-- venderiam.
CREATE OR REPLACE FUNCTION fn_registrar_movimentacao(
  p_produto_id     TEXT,
  p_tipo           tipo_movimentacao,
  p_quantidade     INT,
  p_documento_tipo TEXT DEFAULT NULL,
  p_documento_id   TEXT DEFAULT NULL,
  p_motivo         TEXT DEFAULT NULL,
  p_usuario_id     UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_anterior  INT;
  v_saldo_posterior INT;
  v_id              BIGINT;
BEGIN
  IF p_quantidade = 0 THEN
    RAISE EXCEPTION 'Movimentação de quantidade zero não faz sentido (produto %)', p_produto_id
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT estoque INTO v_saldo_anterior
    FROM produto
   WHERE id = p_produto_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto % não existe', p_produto_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  v_saldo_posterior := v_saldo_anterior + p_quantidade;

  IF v_saldo_posterior < 0 THEN
    RAISE EXCEPTION
      'Estoque insuficiente do produto %: saldo %, movimento %',
      p_produto_id, v_saldo_anterior, p_quantidade
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE produto SET estoque = v_saldo_posterior WHERE id = p_produto_id;

  INSERT INTO movimentacao_estoque (
    produto_id, tipo, quantidade, saldo_anterior, saldo_posterior,
    documento_tipo, documento_id, motivo, usuario_id
  ) VALUES (
    p_produto_id, p_tipo, p_quantidade, v_saldo_anterior, v_saldo_posterior,
    p_documento_tipo, p_documento_id, p_motivo, p_usuario_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION fn_registrar_movimentacao IS
  'Única forma legítima de alterar produto.estoque. Trava a linha do produto, '
  'valida saldo, grava o livro e o saldo na mesma transação.';

-- -----------------------------------------------------------------------------
-- fn_ajustar_estoque — acerto de inventário do painel
-- -----------------------------------------------------------------------------
-- A tela /admin/estoque deixa digitar o saldo contado na prateleira. O que
-- interessa guardar não é o número novo, é a DIFERENÇA e o motivo dela.
CREATE OR REPLACE FUNCTION fn_ajustar_estoque(
  p_produto_id  TEXT,
  p_novo_saldo  INT,
  p_motivo      TEXT DEFAULT 'Acerto de inventário',
  p_usuario_id  UUID DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo_atual INT;
  v_delta       INT;
BEGIN
  IF p_novo_saldo < 0 THEN
    RAISE EXCEPTION 'Saldo de inventário não pode ser negativo (produto %)', p_produto_id
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT estoque INTO v_saldo_atual FROM produto WHERE id = p_produto_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto % não existe', p_produto_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  v_delta := p_novo_saldo - v_saldo_atual;

  -- Contagem bateu com o sistema: não há o que lançar.
  IF v_delta = 0 THEN
    RETURN NULL;
  END IF;

  RETURN fn_registrar_movimentacao(
    p_produto_id, 'ajuste_inventario', v_delta,
    'ajuste', NULL, p_motivo, p_usuario_id
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- fn_receber_ordem_compra — o que dá entrada no estoque
-- -----------------------------------------------------------------------------
-- É a única transição que soma unidades. Rascunho e enviada não movem nada:
-- criar ou editar ordem não altera saldo, por isso a conta a pagar existe
-- antes da mercadoria.
CREATE OR REPLACE FUNCTION fn_receber_ordem_compra(
  p_ordem_id   TEXT,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_status status_ordem_compra;
  v_item   RECORD;
  v_qtd    INT := 0;
BEGIN
  SELECT status INTO v_status
    FROM ordem_compra
   WHERE id = p_ordem_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem de compra % não existe', p_ordem_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Receber duas vezes somaria a mercadoria em dobro. Silenciosamente.
  IF v_status = 'recebida' THEN
    RAISE EXCEPTION 'Ordem de compra % já foi recebida', p_ordem_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Ordem determinística no lock, para não dar deadlock com uma venda
  -- simultânea dos mesmos produtos.
  FOR v_item IN
    SELECT produto_id, quantidade
      FROM item_ordem_compra
     WHERE ordem_compra_id = p_ordem_id
     ORDER BY produto_id
  LOOP
    PERFORM fn_registrar_movimentacao(
      v_item.produto_id, 'entrada_compra', v_item.quantidade,
      'ordem_compra', p_ordem_id,
      'Recebimento da ordem ' || p_ordem_id, p_usuario_id
    );
    v_qtd := v_qtd + v_item.quantidade;
  END LOOP;

  UPDATE ordem_compra
     SET status = 'recebida', recebida_em = now()
   WHERE id = p_ordem_id;

  RETURN v_qtd;
END;
$$;

COMMENT ON FUNCTION fn_receber_ordem_compra IS
  'Aceita receber a partir de rascunho OU enviada, como o painel atual permite '
  '(o botão "Receber no estoque" aparece para todo status <> recebida). '
  'Exigir passagem por "enviada" é endurecimento a combinar com a API.';

-- -----------------------------------------------------------------------------
-- Conciliação
-- -----------------------------------------------------------------------------
-- Se alguma linha aparecer aqui, o saldo divergiu do livro — sinal de que
-- alguém escreveu em produto.estoque por fora.
CREATE OR REPLACE VIEW vw_conciliacao_estoque AS
SELECT
  p.id                                       AS produto_id,
  p.sku,
  p.nome,
  p.estoque                                  AS saldo_atual,
  COALESCE(SUM(m.quantidade), 0)::INT        AS saldo_pelo_livro,
  p.estoque - COALESCE(SUM(m.quantidade), 0)::INT AS diferenca
FROM produto p
LEFT JOIN movimentacao_estoque m ON m.produto_id = p.id
GROUP BY p.id, p.sku, p.nome, p.estoque;

COMMENT ON VIEW vw_conciliacao_estoque IS
  'Teste de sanidade do estoque. Em operação saudável, diferenca = 0 em todas '
  'as linhas: SELECT * FROM vw_conciliacao_estoque WHERE diferenca <> 0;';

INSERT INTO migracao (versao, descricao) VALUES
  ('006', 'Livro de movimentação de estoque e funções de saldo')
ON CONFLICT (versao) DO NOTHING;
