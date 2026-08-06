-- =============================================================================
-- 005 — Ordens de compra
-- =============================================================================
-- O Setor de Compras controla tudo que ENTRA no estoque. A regra que o painel
-- inteiro depende: rascunho e enviada não mexem em saldo nenhum. Só o
-- recebimento move — e quem move é fn_receber_ordem_compra() (migration 006).
--
-- Ordem não recebida é, ao mesmo tempo, "conta a pagar" no Financeiro. É a
-- mesma linha vista de outro ângulo, não uma segunda tabela.
-- =============================================================================

CREATE SEQUENCE ordem_compra_numero_seq START WITH 2041 INCREMENT BY 1;

-- -----------------------------------------------------------------------------
-- ordem_compra
-- -----------------------------------------------------------------------------
CREATE TABLE ordem_compra (
  id            TEXT PRIMARY KEY
                DEFAULT 'OC-' || nextval('ordem_compra_numero_seq'),
  fornecedor_id INT  NOT NULL REFERENCES fornecedor(id) ON DELETE RESTRICT,

  data          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Data prometida de entrega. É o que o Financeiro usa para ordenar contas a
  -- pagar e o que o Compras usa para saber se vai chegar a tempo.
  previsao      DATE        NOT NULL,
  status        status_ordem_compra NOT NULL DEFAULT 'rascunho',
  recebida_em   TIMESTAMPTZ,

  total_centavos BIGINT     NOT NULL DEFAULT 0,

  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ordem_compra_total_nao_negativo CHECK (total_centavos >= 0),
  -- `recebida_em` e o status andam juntos: um sem o outro é estado impossível,
  -- e estado impossível no banco vira número errado no painel.
  CONSTRAINT ordem_compra_recebimento_coerente CHECK (
    (status = 'recebida' AND recebida_em IS NOT NULL)
    OR (status <> 'recebida' AND recebida_em IS NULL)
  )
);

CREATE TRIGGER trg_ordem_compra_atualizado_em
  BEFORE UPDATE ON ordem_compra
  FOR EACH ROW EXECUTE FUNCTION fn_tocar_atualizado_em();

COMMENT ON TABLE ordem_compra IS
  'Ordem em rascunho ou enviada NÃO altera estoque. Só o recebimento move — '
  'ver fn_receber_ordem_compra() na migration 006.';

-- -----------------------------------------------------------------------------
-- item_ordem_compra
-- -----------------------------------------------------------------------------
CREATE TABLE item_ordem_compra (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ordem_compra_id         TEXT NOT NULL REFERENCES ordem_compra(id) ON DELETE CASCADE,
  produto_id              TEXT NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
  quantidade              INT    NOT NULL,
  -- Custo negociado nesta ordem. Não é o custo atual do produto: o custo pode
  -- ter mudado entre a compra e o recebimento, e a conta a pagar é a do acordo.
  custo_unitario_centavos BIGINT NOT NULL,

  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT item_ordem_compra_quantidade_positiva CHECK (quantidade > 0),
  CONSTRAINT item_ordem_compra_custo_nao_negativo  CHECK (custo_unitario_centavos >= 0),
  CONSTRAINT item_ordem_compra_produto_unico UNIQUE (ordem_compra_id, produto_id)
);

INSERT INTO migracao (versao, descricao) VALUES
  ('005', 'Ordens de compra e seus itens')
ON CONFLICT (versao) DO NOTHING;
