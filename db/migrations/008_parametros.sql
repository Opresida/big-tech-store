-- =============================================================================
-- 008 — Parâmetros comerciais e fechamento de pedido
-- =============================================================================
-- Correção 6 do prompt: preço nunca é decidido pelo cliente.
--
-- Hoje o desconto de 5% do Pix e o parcelamento em 12x são calculados no
-- navegador, em dois lugares (`formato.ts` e `FormularioCheckout.tsx`). Um
-- cliente com o DevTools aberto define o próprio desconto. A partir daqui a
-- regra mora no banco e o total do pedido é calculado a partir do preço que
-- está em `produto` — o que vem do navegador é só a lista de itens.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- parametro
-- -----------------------------------------------------------------------------
CREATE TABLE parametro (
  chave         TEXT        PRIMARY KEY,
  valor         JSONB       NOT NULL,
  descricao     TEXT        NOT NULL DEFAULT '',
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_parametro_atualizado_em
  BEFORE UPDATE ON parametro
  FOR EACH ROW EXECUTE FUNCTION fn_tocar_atualizado_em();

INSERT INTO parametro (chave, valor, descricao) VALUES
  ('desconto_pix_percentual', '5'::JSONB,
   'Desconto do Pix sobre o subtotal, em porcento (Brandbook 06).'),
  ('parcelas_max', '12'::JSONB,
   'Parcelamento máximo sem juros no cartão de crédito.'),
  ('frete_gratis_acima_centavos', '29900'::JSONB,
   'Frete grátis a partir deste subtotal. Regra provisória: R$ 299,00.'),
  ('frete_padrao_centavos', '2990'::JSONB,
   'Frete cobrado abaixo do piso de frete grátis. Provisório: R$ 29,90.')
ON CONFLICT (chave) DO NOTHING;

COMMENT ON TABLE parametro IS
  'Regras comerciais parametrizáveis. Trocar valor aqui muda a loja inteira '
  'sem deploy. A política de frete real ainda depende do cliente (TODO.md).';

CREATE OR REPLACE FUNCTION fn_parametro_int(p_chave TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE v BIGINT;
BEGIN
  SELECT (valor #>> '{}')::BIGINT INTO v FROM parametro WHERE chave = p_chave;
  IF v IS NULL THEN
    RAISE EXCEPTION 'Parâmetro % não configurado', p_chave
      USING ERRCODE = 'no_data_found';
  END IF;
  RETURN v;
END;
$$;

-- -----------------------------------------------------------------------------
-- Frete
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_frete(p_subtotal_centavos BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_subtotal_centavos >= fn_parametro_int('frete_gratis_acima_centavos') THEN
    RETURN 0;
  END IF;
  RETURN fn_parametro_int('frete_padrao_centavos');
END;
$$;

-- -----------------------------------------------------------------------------
-- Desconto por forma de pagamento
-- -----------------------------------------------------------------------------
-- Só o Pix abate. Cartão parcela sem juros (não muda o total) e boleto é cheio.
-- O arredondamento é o mesmo do front — meio centavo para cima —, para que a
-- migração não mude o valor de nenhum pedido histórico.
CREATE OR REPLACE FUNCTION fn_calcular_desconto(
  p_subtotal_centavos BIGINT,
  p_pagamento         forma_pagamento
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_pct   NUMERIC;
  v_total BIGINT;
BEGIN
  IF p_pagamento <> 'pix' THEN
    RETURN 0;
  END IF;

  v_pct := fn_parametro_int('desconto_pix_percentual')::NUMERIC / 100;
  -- Arredonda o TOTAL e deriva o desconto, e não o contrário: é assim que o
  -- total continua fechando exatamente com subtotal − desconto.
  v_total := ROUND(p_subtotal_centavos * (1 - v_pct));
  RETURN p_subtotal_centavos - v_total;
END;
$$;

-- -----------------------------------------------------------------------------
-- fn_finalizar_pedido — a venda
-- -----------------------------------------------------------------------------
-- Recebe apenas QUAIS itens e QUANTOS. Preço, custo, desconto e frete vêm do
-- banco.
--
-- p_itens: [{"produto_id": "p01", "quantidade": 2}, ...]
--
-- Concorrência: os produtos são travados em ordem de id, sempre. Dois carrinhos
-- com os mesmos itens em ordens diferentes viram fila em vez de deadlock; e
-- quem chegar depois lê o saldo já baixado, então a última unidade não é
-- vendida duas vezes.
CREATE OR REPLACE FUNCTION fn_finalizar_pedido(
  p_cliente_nome TEXT,
  p_pagamento    forma_pagamento,
  p_itens        JSONB,
  p_canal        canal_pedido DEFAULT 'site',
  p_cliente_id   UUID DEFAULT NULL,
  p_endereco_id  UUID DEFAULT NULL,
  p_usuario_id   UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_pedido_id TEXT;
  v_subtotal  BIGINT := 0;
  v_custo     BIGINT := 0;
  v_desconto  BIGINT;
  v_frete     BIGINT;
  v_item      RECORD;
  v_produto   RECORD;
BEGIN
  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Pedido sem itens' USING ERRCODE = 'check_violation';
  END IF;

  -- Passo 1 — travar os produtos em ordem determinística e somar com o preço
  -- do banco. Nada de aceitar total pronto do cliente.
  FOR v_item IN
    SELECT (e->>'produto_id')::TEXT AS produto_id,
           SUM((e->>'quantidade')::INT)::INT AS quantidade
      FROM jsonb_array_elements(p_itens) e
     GROUP BY 1
     ORDER BY 1
  LOOP
    IF v_item.quantidade <= 0 THEN
      RAISE EXCEPTION 'Quantidade inválida para o produto %', v_item.produto_id
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT id, nome, sku, preco_centavos, custo_centavos, estoque, status
      INTO v_produto
      FROM produto
     WHERE id = v_item.produto_id
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto % não existe', v_item.produto_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;

    IF v_produto.status <> 'ativo' THEN
      RAISE EXCEPTION 'Produto % (%) não está à venda', v_produto.sku, v_produto.status
        USING ERRCODE = 'check_violation';
    END IF;

    -- Checagem antecipada só para dar mensagem melhor; a garantia de verdade é
    -- o CHECK de estoque e a trava do livro, no passo 3.
    IF v_produto.estoque < v_item.quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente de % : disponível %, pedido %',
        v_produto.sku, v_produto.estoque, v_item.quantidade
        USING ERRCODE = 'check_violation';
    END IF;

    v_subtotal := v_subtotal + v_produto.preco_centavos * v_item.quantidade;
    v_custo    := v_custo    + v_produto.custo_centavos * v_item.quantidade;
  END LOOP;

  v_desconto := fn_calcular_desconto(v_subtotal, p_pagamento);
  v_frete    := fn_calcular_frete(v_subtotal);

  -- Passo 2 — gravar o pedido.
  INSERT INTO pedido (
    cliente_id, cliente_nome, endereco_entrega_id, pagamento, canal, status,
    subtotal_centavos, desconto_centavos, frete_centavos,
    total_centavos, custo_total_centavos
  ) VALUES (
    p_cliente_id, p_cliente_nome, p_endereco_id, p_pagamento, p_canal, 'aprovado',
    v_subtotal, v_desconto, v_frete,
    v_subtotal - v_desconto + v_frete, v_custo
  )
  RETURNING id INTO v_pedido_id;

  -- Passo 3 — itens com snapshot e baixa no livro de estoque, na mesma ordem.
  FOR v_item IN
    SELECT (e->>'produto_id')::TEXT AS produto_id,
           SUM((e->>'quantidade')::INT)::INT AS quantidade
      FROM jsonb_array_elements(p_itens) e
     GROUP BY 1
     ORDER BY 1
  LOOP
    SELECT nome, sku, preco_centavos, custo_centavos
      INTO v_produto
      FROM produto
     WHERE id = v_item.produto_id;

    INSERT INTO item_pedido (
      pedido_id, produto_id, nome, sku, quantidade,
      preco_unitario_centavos, custo_unitario_centavos
    ) VALUES (
      v_pedido_id, v_item.produto_id, v_produto.nome, v_produto.sku, v_item.quantidade,
      v_produto.preco_centavos, v_produto.custo_centavos
    );

    PERFORM fn_registrar_movimentacao(
      v_item.produto_id, 'saida_venda', -v_item.quantidade,
      'pedido', v_pedido_id, 'Venda ' || v_pedido_id, p_usuario_id
    );
  END LOOP;

  RETURN v_pedido_id;
END;
$$;

COMMENT ON FUNCTION fn_finalizar_pedido IS
  'Fecha a venda com preço do servidor. ATENÇÃO na integração: esta função '
  'soma frete ao total (regra parametrizada), enquanto o checkout do front '
  'hoje não soma — o Pedido do mock não tem campo de frete. Alinhar as duas '
  'pontas antes de ligar o checkout real.';

INSERT INTO migracao (versao, descricao) VALUES
  ('008', 'Parâmetros comerciais, frete, desconto e fechamento de pedido')
ON CONFLICT (versao) DO NOTHING;
