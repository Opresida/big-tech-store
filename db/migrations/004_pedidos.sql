-- =============================================================================
-- 004 — Pedidos e itens de pedido
-- =============================================================================
-- Correções 6 e 7 do prompt:
--   6. preço nunca é decidido pelo cliente — o dinheiro do pedido vem
--      decomposto (subtotal, desconto, frete, total) para que o servidor possa
--      recalcular e conferir, em vez de aceitar um total pronto do navegador;
--   7. snapshot de preço e custo no item é regra, não conveniência.
--
-- Sobre o id: o front gera `BTS-${Date.now()/1000 % 100000}`, que colide se
-- dois pedidos caírem no mesmo segundo (e volta a repetir a cada ~27 horas).
-- Aqui a numeração é do banco.
-- =============================================================================

CREATE SEQUENCE pedido_numero_seq START WITH 1000 INCREMENT BY 1;

-- -----------------------------------------------------------------------------
-- pedido
-- -----------------------------------------------------------------------------
CREATE TABLE pedido (
  id                  TEXT        PRIMARY KEY
                                  DEFAULT 'BTS-' || nextval('pedido_numero_seq'),

  -- Nulável porque o histórico mockado não tem cadastro por trás. Pedido novo,
  -- vindo do checkout, aponta para o cliente.
  cliente_id          UUID        REFERENCES cliente(id) ON DELETE SET NULL,

  -- Snapshot do nome no momento da compra. Se o cliente corrigir o cadastro
  -- amanhã, a nota de ontem continua com o nome de ontem.
  cliente_nome        TEXT        NOT NULL,

  endereco_entrega_id UUID        REFERENCES endereco(id) ON DELETE SET NULL,

  data                TIMESTAMPTZ NOT NULL DEFAULT now(),
  pagamento           forma_pagamento NOT NULL,
  status              status_pedido   NOT NULL DEFAULT 'aprovado',
  canal               canal_pedido    NOT NULL DEFAULT 'site',

  -- Dinheiro decomposto, tudo em centavos:
  --   subtotal = Σ(preço unitário × quantidade), antes de qualquer abatimento
  --   desconto = abatimento aplicado (hoje, só o Pix de 5%)
  --   frete    = valor cobrado de entrega
  --   total    = subtotal − desconto + frete  (o que o cliente paga)
  --   custo    = Σ(custo unitário × quantidade), base da margem
  subtotal_centavos     BIGINT NOT NULL,
  desconto_centavos     BIGINT NOT NULL DEFAULT 0,
  frete_centavos        BIGINT NOT NULL DEFAULT 0,
  total_centavos        BIGINT NOT NULL,
  custo_total_centavos  BIGINT NOT NULL,

  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT pedido_subtotal_nao_negativo CHECK (subtotal_centavos >= 0),
  CONSTRAINT pedido_desconto_nao_negativo CHECK (desconto_centavos >= 0),
  CONSTRAINT pedido_frete_nao_negativo    CHECK (frete_centavos >= 0),
  CONSTRAINT pedido_total_nao_negativo    CHECK (total_centavos >= 0),
  CONSTRAINT pedido_custo_nao_negativo    CHECK (custo_total_centavos >= 0),
  -- O total não é um número solto: tem de fechar com as partes. É esta linha
  -- que impede um total vindo do cliente de entrar sem bater com o resto.
  CONSTRAINT pedido_total_fecha
    CHECK (total_centavos = subtotal_centavos - desconto_centavos + frete_centavos),
  CONSTRAINT pedido_desconto_ate_subtotal CHECK (desconto_centavos <= subtotal_centavos)
);

CREATE TRIGGER trg_pedido_atualizado_em
  BEFORE UPDATE ON pedido
  FOR EACH ROW EXECUTE FUNCTION fn_tocar_atualizado_em();

COMMENT ON TABLE pedido IS
  'Pedido cancelado NÃO entra em receita, custo, margem, ranking ou giro. '
  'O filtro está dentro de cada função de gestão (migration 009), não na chamada.';

COMMENT ON COLUMN pedido.frete_centavos IS
  'EXTENSÃO: o tipo Pedido do front não guarda frete — o carrinho apenas o '
  'exibe (grátis acima de R$ 299, senão R$ 29,90). Nasce zerado no seed. '
  'A regra é parametrizável em `parametro` (migration 008).';

-- -----------------------------------------------------------------------------
-- item_pedido
-- -----------------------------------------------------------------------------
-- Os snapshots (`nome`, `sku`, preço e custo unitários) são o coração da
-- honestidade do Financeiro: se o preço do produto mudar amanhã, a margem
-- histórica não pode mudar junto.
CREATE TABLE item_pedido (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id              TEXT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  -- RESTRICT: produto que já foi vendido não se apaga — sai por status.
  produto_id             TEXT NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,

  nome                   TEXT   NOT NULL,
  sku                    TEXT   NOT NULL,
  quantidade             INT    NOT NULL,
  preco_unitario_centavos BIGINT NOT NULL,
  custo_unitario_centavos BIGINT NOT NULL,

  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT item_pedido_quantidade_positiva CHECK (quantidade > 0),
  CONSTRAINT item_pedido_preco_nao_negativo  CHECK (preco_unitario_centavos >= 0),
  CONSTRAINT item_pedido_custo_nao_negativo  CHECK (custo_unitario_centavos >= 0),
  -- Um produto aparece uma vez por pedido, com a quantidade somada. É como o
  -- carrinho do front já se comporta, e é o que faz "número de pedidos" do
  -- ranking dar o mesmo resultado contando itens ou contando pedidos distintos.
  CONSTRAINT item_pedido_produto_unico UNIQUE (pedido_id, produto_id)
);

COMMENT ON COLUMN item_pedido.preco_unitario_centavos IS
  'Preço praticado NO MOMENTO da venda. Não é o preço atual do produto.';

INSERT INTO migracao (versao, descricao) VALUES
  ('004', 'Pedidos e itens de pedido')
ON CONFLICT (versao) DO NOTHING;
