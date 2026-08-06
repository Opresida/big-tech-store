-- =============================================================================
-- 001 — Domínios, enums e utilidades
-- =============================================================================
-- Base de tudo: o controle de versão das próprias migrations, os tipos
-- enumerados do domínio e o gatilho de `atualizado_em`.
--
-- Os enums repetem exatamente os literais do front (`src/lib/tipos.ts`),
-- inclusive os que têm hífen (`frete-gratis`, `mais-vendido`,
-- `checkout-direto`). Traduzir ou normalizar criaria atrito na integração.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Controle de migrations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migracao (
  versao      TEXT PRIMARY KEY,
  descricao   TEXT        NOT NULL,
  aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE migracao IS
  'Registro das migrations aplicadas. Nunca rode DDL fora de um arquivo versionado.';

-- -----------------------------------------------------------------------------
-- Enums do catálogo
-- -----------------------------------------------------------------------------

-- Silhueta usada pelo placeholder de foto (FotoProduto.tsx). Some no dia em que
-- as fotos reais entrarem, mas hoje é dado que a vitrine consome.
CREATE TYPE forma_produto AS ENUM (
  'console', 'celular', 'notebook', 'audio', 'controle'
);

CREATE TYPE selo_produto AS ENUM (
  'lancamento', 'frete-gratis', 'mais-vendido'
);

-- Produto não se apaga: sai de circulação por status, senão o histórico de
-- vendas perde a referência.
CREATE TYPE status_produto AS ENUM (
  'ativo', 'inativo', 'descontinuado'
);

-- -----------------------------------------------------------------------------
-- Enums de venda
-- -----------------------------------------------------------------------------
CREATE TYPE forma_pagamento AS ENUM ('pix', 'credito', 'boleto');

CREATE TYPE status_pedido AS ENUM ('aprovado', 'processando', 'cancelado');

-- `checkout-direto` é a página de conversão de um produto só (/checkout/:slug).
CREATE TYPE canal_pedido AS ENUM ('site', 'checkout-direto');

-- -----------------------------------------------------------------------------
-- Enums de compra e estoque
-- -----------------------------------------------------------------------------
CREATE TYPE status_ordem_compra AS ENUM ('rascunho', 'enviada', 'recebida');

-- As quatro razões pelas quais um saldo pode mudar. Toda linha do livro de
-- estoque tem uma delas — não existe alteração de saldo sem motivo.
CREATE TYPE tipo_movimentacao AS ENUM (
  'entrada_compra', 'saida_venda', 'ajuste_inventario', 'devolucao'
);

-- -----------------------------------------------------------------------------
-- Enums de acesso
-- -----------------------------------------------------------------------------
CREATE TYPE papel_admin AS ENUM (
  'admin', 'estoque', 'compras', 'vendas', 'financeiro'
);

CREATE TYPE acao_auditoria AS ENUM ('criacao', 'alteracao', 'exclusao_logica');

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

-- Mantém `atualizado_em` sem depender de a aplicação lembrar de preencher.
CREATE OR REPLACE FUNCTION fn_tocar_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_tocar_atualizado_em() IS
  'Trigger BEFORE UPDATE: carimba atualizado_em. Usada por todas as tabelas.';

-- Fuso da operação. As janelas de 7/30/90 dias e o agrupamento mensal precisam
-- bater com o dia civil brasileiro, não com o UTC — um pedido das 22h de
-- terça em São Paulo é de terça, mesmo sendo quarta em Londres.
CREATE OR REPLACE FUNCTION fn_fuso_operacao()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 'America/Sao_Paulo'::TEXT $$;

COMMENT ON FUNCTION fn_fuso_operacao() IS
  'Fuso único da operação. Trocar aqui muda todos os relatórios de uma vez.';

INSERT INTO migracao (versao, descricao) VALUES
  ('001', 'Domínios, enums e utilidades')
ON CONFLICT (versao) DO NOTHING;
