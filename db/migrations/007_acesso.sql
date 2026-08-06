-- =============================================================================
-- 007 — Usuários administrativos, papéis e auditoria
-- =============================================================================
-- Hoje a autenticação é uma comparação de string no navegador
-- (`entrar()` em src/lib/loja.tsx, credencial fixa admin@bigtechstore.com.br).
-- Aqui nasce o que substitui isso.
--
-- Decisão tomada com o cliente: os papéis são TABELAS DA APLICAÇÃO, não roles
-- nativas do Postgres com RLS. Quem aplica a regra é a API da próxima etapa.
-- Motivo: casa com o front atual (entrar() vira POST /auth/login), é o que os
-- ORMs esperam, e RLS exigiria a API trocar de role a cada requisição. A porta
-- para RLS fica aberta — `papel` já está normalizado.
-- =============================================================================

-- pgcrypto dá o crypt()/gen_salt() usados para gerar o hash bcrypt da senha.
-- gen_random_uuid() já é nativo no PG 13+, não depende desta extensão.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- usuario_admin
-- -----------------------------------------------------------------------------
CREATE TABLE usuario_admin (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           TEXT        NOT NULL,
  email          TEXT        NOT NULL UNIQUE,

  -- Hash Argon2id ou bcrypt gerado pela aplicação. Senha em texto claro não
  -- entra aqui em hipótese nenhuma — nem "temporariamente".
  senha_hash     TEXT        NOT NULL,
  papel          papel_admin NOT NULL,
  ativo          BOOLEAN     NOT NULL DEFAULT TRUE,
  ultimo_acesso_em TIMESTAMPTZ,

  criado_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT usuario_admin_email_formato
    CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- Barreira grosseira contra gravar a senha crua por engano: todo hash de
  -- bcrypt/Argon2 começa com '$'.
  CONSTRAINT usuario_admin_senha_e_hash CHECK (senha_hash LIKE '$%')
);

CREATE TRIGGER trg_usuario_admin_atualizado_em
  BEFORE UPDATE ON usuario_admin
  FOR EACH ROW EXECUTE FUNCTION fn_tocar_atualizado_em();

COMMENT ON TABLE usuario_admin IS
  'Papéis: admin (tudo), estoque, compras, vendas, financeiro. A autorização '
  'por papel é aplicada pela API — ver ARQUITETURA.md para a matriz de acesso.';

-- A FK do livro de estoque só pôde ser criada agora, que usuario_admin existe.
ALTER TABLE movimentacao_estoque
  ADD CONSTRAINT movimentacao_usuario_fk
  FOREIGN KEY (usuario_id) REFERENCES usuario_admin(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- auditoria
-- -----------------------------------------------------------------------------
-- Alteração sensível é a que mexe em dinheiro ou em saldo: preço, custo,
-- estoque, estoque-alvo e recebimento de ordem. O registro guarda o valor
-- anterior E o novo — sem o anterior, não dá para responder "mudou de quanto
-- para quanto".
CREATE TABLE auditoria (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tabela         TEXT           NOT NULL,
  registro_id    TEXT           NOT NULL,
  campo          TEXT           NOT NULL,
  valor_anterior TEXT,
  valor_novo     TEXT,
  acao           acao_auditoria NOT NULL DEFAULT 'alteracao',
  usuario_id     UUID           REFERENCES usuario_admin(id) ON DELETE SET NULL,
  criado_em      TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX ix_auditoria_registro ON auditoria (tabela, registro_id, criado_em DESC);
CREATE INDEX ix_auditoria_criado_em ON auditoria (criado_em DESC);

-- -----------------------------------------------------------------------------
-- Autor da alteração
-- -----------------------------------------------------------------------------
-- Triggers não recebem parâmetro. A aplicação declara quem está logado com
--   SELECT set_config('bts.usuario_id', '<uuid>', true);
-- no início da transação, e o gatilho lê daqui. O `true` limita ao escopo da
-- transação — não vaza para a próxima requisição do mesmo pool de conexão.
CREATE OR REPLACE FUNCTION fn_usuario_corrente()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v TEXT;
BEGIN
  v := current_setting('bts.usuario_id', true);
  IF v IS NULL OR v = '' THEN
    RETURN NULL;
  END IF;
  RETURN v::UUID;
EXCEPTION WHEN others THEN
  -- Valor malformado não pode derrubar a operação de negócio.
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION fn_usuario_corrente() IS
  'Autor da transação, declarado por set_config(''bts.usuario_id'', <uuid>, true).';

-- -----------------------------------------------------------------------------
-- Trilha do produto
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auditar_produto()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_usuario UUID := fn_usuario_corrente();
BEGIN
  IF NEW.preco_centavos IS DISTINCT FROM OLD.preco_centavos THEN
    INSERT INTO auditoria (tabela, registro_id, campo, valor_anterior, valor_novo, usuario_id)
    VALUES ('produto', NEW.id, 'preco_centavos',
            OLD.preco_centavos::TEXT, NEW.preco_centavos::TEXT, v_usuario);
  END IF;

  IF NEW.custo_centavos IS DISTINCT FROM OLD.custo_centavos THEN
    INSERT INTO auditoria (tabela, registro_id, campo, valor_anterior, valor_novo, usuario_id)
    VALUES ('produto', NEW.id, 'custo_centavos',
            OLD.custo_centavos::TEXT, NEW.custo_centavos::TEXT, v_usuario);
  END IF;

  IF NEW.estoque IS DISTINCT FROM OLD.estoque THEN
    INSERT INTO auditoria (tabela, registro_id, campo, valor_anterior, valor_novo, usuario_id)
    VALUES ('produto', NEW.id, 'estoque',
            OLD.estoque::TEXT, NEW.estoque::TEXT, v_usuario);
  END IF;

  IF NEW.estoque_alvo IS DISTINCT FROM OLD.estoque_alvo THEN
    INSERT INTO auditoria (tabela, registro_id, campo, valor_anterior, valor_novo, usuario_id)
    VALUES ('produto', NEW.id, 'estoque_alvo',
            OLD.estoque_alvo::TEXT, NEW.estoque_alvo::TEXT, v_usuario);
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO auditoria (tabela, registro_id, campo, valor_anterior, valor_novo, usuario_id, acao)
    VALUES ('produto', NEW.id, 'status',
            OLD.status::TEXT, NEW.status::TEXT, v_usuario,
            CASE WHEN NEW.status = 'ativo' THEN 'alteracao' ELSE 'exclusao_logica' END);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_produto_auditoria
  AFTER UPDATE ON produto
  FOR EACH ROW EXECUTE FUNCTION fn_auditar_produto();

-- -----------------------------------------------------------------------------
-- Trilha da ordem de compra
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auditar_ordem_compra()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO auditoria (tabela, registro_id, campo, valor_anterior, valor_novo, usuario_id)
    VALUES ('ordem_compra', NEW.id, 'status',
            OLD.status::TEXT, NEW.status::TEXT, fn_usuario_corrente());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ordem_compra_auditoria
  AFTER UPDATE ON ordem_compra
  FOR EACH ROW EXECUTE FUNCTION fn_auditar_ordem_compra();

INSERT INTO migracao (versao, descricao) VALUES
  ('007', 'Usuários administrativos, papéis e trilha de auditoria')
ON CONFLICT (versao) DO NOTHING;
