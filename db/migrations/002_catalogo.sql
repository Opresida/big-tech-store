-- =============================================================================
-- 002 — Catálogo: categoria, fornecedor, produto
-- =============================================================================
-- Correções 2, 3 e 8 do prompt entram aqui:
--   2. fornecedor deixa de ser texto solto e vira tabela;
--   3. categoria deixa de ser enum no código e vira tabela;
--   8. produto não se apaga — sai por status.
--
-- E a correção 1 (dinheiro nunca em float) aparece em toda coluna monetária:
-- BIGINT em centavos, com o sufixo `_centavos` no nome para que ninguém trate
-- 349900 como reais por engano.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- categoria
-- -----------------------------------------------------------------------------
-- A PK é o slug (`consoles`, `celulares`…) e não um serial: o front já usa esses
-- valores em URL (/produtos?categoria=consoles) e em `CategoriaId`. Chave
-- estável e legível vale mais que número sequencial aqui.
CREATE TABLE categoria (
  id          TEXT        PRIMARY KEY,
  nome        TEXT        NOT NULL,
  descricao   TEXT        NOT NULL DEFAULT '',
  ordem       SMALLINT    NOT NULL DEFAULT 0,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT categoria_id_slug CHECK (id ~ '^[a-z][a-z0-9-]*$')
);

CREATE TRIGGER trg_categoria_atualizado_em
  BEFORE UPDATE ON categoria
  FOR EACH ROW EXECUTE FUNCTION fn_tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- fornecedor
-- -----------------------------------------------------------------------------
-- `prazo_medio_dias` não é enfeite: é o que permite ao Setor de Compras dizer
-- "peça hoje senão falta", cruzando com dias_cobertura de fn_cobertura().
CREATE TABLE fornecedor (
  id             INT         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome           TEXT        NOT NULL UNIQUE,
  cnpj           TEXT,
  contato_nome   TEXT,
  contato_email  TEXT,
  contato_telefone TEXT,
  prazo_medio_dias SMALLINT  NOT NULL DEFAULT 15,
  ativo          BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 14 dígitos, guardados sem máscara. Nulo é permitido: o mock não tem CNPJ e
  -- inventar documento é pior que deixar em branco.
  CONSTRAINT fornecedor_cnpj_digitos CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),
  CONSTRAINT fornecedor_prazo_positivo CHECK (prazo_medio_dias > 0)
);

CREATE TRIGGER trg_fornecedor_atualizado_em
  BEFORE UPDATE ON fornecedor
  FOR EACH ROW EXECUTE FUNCTION fn_tocar_atualizado_em();

-- -----------------------------------------------------------------------------
-- produto
-- -----------------------------------------------------------------------------
-- O id textual (`p01`…`p20`) do mock é preservado de propósito: ele já está
-- gravado no localStorage dos navegadores e é a chave que o front usa em
-- `produtoPorId`. Trocar por UUID agora só criaria trabalho de tradução.
CREATE TABLE produto (
  id                TEXT        PRIMARY KEY,
  slug              TEXT        NOT NULL UNIQUE,
  sku               TEXT        NOT NULL UNIQUE,
  nome              TEXT        NOT NULL,
  marca             TEXT        NOT NULL,
  categoria_id      TEXT        NOT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
  fornecedor_id     INT         NOT NULL REFERENCES fornecedor(id) ON DELETE RESTRICT,
  forma             forma_produto NOT NULL,

  -- Dinheiro em centavos. `preco_de` é o preço cheio riscado na vitrine,
  -- `preco` é o à vista praticado, `custo` é a base da margem do Financeiro.
  preco_de_centavos BIGINT      NOT NULL,
  preco_centavos    BIGINT      NOT NULL,
  custo_centavos    BIGINT      NOT NULL,

  estoque           INT         NOT NULL DEFAULT 0,
  estoque_alvo      INT         NOT NULL DEFAULT 1,

  -- Agregados de avaliação. Ficam desnormalizados enquanto não existir tabela
  -- de avaliação escrita (fora do escopo desta etapa) — quando existir, viram
  -- coluna derivada ou view.
  nota              NUMERIC(2,1) NOT NULL DEFAULT 0,
  avaliacoes        INT         NOT NULL DEFAULT 0,

  resumo            TEXT        NOT NULL DEFAULT '',
  status            status_produto NOT NULL DEFAULT 'ativo',
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- O CHECK de estoque é a última linha de defesa contra vender a última
  -- unidade duas vezes. Mesmo com bug na aplicação, o banco recusa.
  CONSTRAINT produto_estoque_nao_negativo CHECK (estoque >= 0),
  -- estoque_alvo é divisor da barra de nível; zero quebraria a conta.
  CONSTRAINT produto_estoque_alvo_positivo CHECK (estoque_alvo >= 1),
  CONSTRAINT produto_preco_de_nao_negativo CHECK (preco_de_centavos >= 0),
  CONSTRAINT produto_preco_nao_negativo    CHECK (preco_centavos >= 0),
  CONSTRAINT produto_custo_nao_negativo    CHECK (custo_centavos >= 0),
  CONSTRAINT produto_nota_valida           CHECK (nota >= 0 AND nota <= 5),
  CONSTRAINT produto_avaliacoes_nao_negativo CHECK (avaliacoes >= 0),
  CONSTRAINT produto_slug_valido CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$')
);

CREATE TRIGGER trg_produto_atualizado_em
  BEFORE UPDATE ON produto
  FOR EACH ROW EXECUTE FUNCTION fn_tocar_atualizado_em();

COMMENT ON COLUMN produto.estoque IS
  'Saldo atual. Só muda por fn_registrar_movimentacao() — ver migration 006. '
  'Tem de ser sempre igual a SUM(movimentacao_estoque.quantidade) do produto.';

COMMENT ON COLUMN produto.estoque_alvo IS
  'Base da barra de nível: verde >40%, âmbar 15–40%, vermelho <15% (Brandbook 06).';

-- -----------------------------------------------------------------------------
-- Listas do produto
-- -----------------------------------------------------------------------------
-- Os três arrays do tipo TS viram tabelas filhas. A coluna `ordem` preserva a
-- sequência em que a página do produto exibe — array de JSON manteria a ordem
-- mas não deixaria filtrar nem indexar selo.

CREATE TABLE produto_selo (
  produto_id TEXT         NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
  selo       selo_produto NOT NULL,
  PRIMARY KEY (produto_id, selo)
);

CREATE TABLE produto_destaque (
  produto_id TEXT     NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL,
  texto      TEXT     NOT NULL,
  PRIMARY KEY (produto_id, ordem)
);

CREATE TABLE produto_ficha (
  produto_id TEXT     NOT NULL REFERENCES produto(id) ON DELETE CASCADE,
  ordem      SMALLINT NOT NULL,
  rotulo     TEXT     NOT NULL,
  valor      TEXT     NOT NULL,
  PRIMARY KEY (produto_id, ordem)
);

COMMENT ON TABLE produto_destaque IS 'Bullets da página do produto, na ordem exibida.';
COMMENT ON TABLE produto_ficha    IS 'Ficha técnica: rótulo e valor, na ordem exibida.';

-- -----------------------------------------------------------------------------
-- Nível de estoque — a regra única
-- -----------------------------------------------------------------------------
-- Brandbook 06 e src/lib/estoque.ts: verde acima de 40% do alvo, âmbar entre
-- 15% e 40%, vermelho abaixo de 15%, cinza quando zera. Loja e painel leem
-- daqui; duplicar essa regra em SQL e no front é como as duas telas passam a
-- discordar sobre o mesmo produto.
CREATE OR REPLACE FUNCTION fn_nivel_estoque(p_estoque INT, p_estoque_alvo INT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_estoque <= 0 THEN 'esgotado'
    WHEN p_estoque::NUMERIC / GREATEST(p_estoque_alvo, 1) < 0.15 THEN 'critico'
    WHEN p_estoque::NUMERIC / GREATEST(p_estoque_alvo, 1) < 0.40 THEN 'baixo'
    ELSE 'ok'
  END;
$$;

COMMENT ON FUNCTION fn_nivel_estoque(INT, INT) IS
  'Espelha nivelEstoque() de src/lib/estoque.ts. Regra única da loja e do painel.';

INSERT INTO migracao (versao, descricao) VALUES
  ('002', 'Catálogo: categoria, fornecedor, produto e listas')
ON CONFLICT (versao) DO NOTHING;
