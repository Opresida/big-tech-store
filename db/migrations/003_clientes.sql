-- =============================================================================
-- 003 — Clientes e endereços
-- =============================================================================
-- Correção 4 do prompt: hoje o pedido guarda só o nome do cliente.
--
-- O detalhe que importa: o checkout JÁ COLETA tudo isto — nome, e-mail, CPF,
-- telefone, CEP, endereço, número, complemento, cidade e UF
-- (`FormularioCheckout.tsx`, tipo `Campos`) — e `finalizarPedido()` descarta
-- todos menos o nome. Não é passar a coletar mais dado; é parar de jogar fora
-- o que já se coleta.
--
-- As colunas abaixo são exatamente as do formulário. Nada além disso: `bairro`
-- ficou de fora porque o checkout não pergunta, e campo que nenhuma tela
-- preenche nasce nulo para sempre. Entra junto com o ViaCEP, quando entrar.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- cliente
-- -----------------------------------------------------------------------------
CREATE TABLE cliente (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,

  -- CPF nulável de propósito. O histórico de 90 dias do mock só tem nome; o
  -- seed não inventa documento de pessoa. Pedido novo, vindo do checkout,
  -- chega com CPF. Guardado sem máscara, como o formulário já normaliza.
  cpf           TEXT        UNIQUE,
  telefone      TEXT,

  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cliente_cpf_digitos CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$'),
  CONSTRAINT cliente_email_formato CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- O formulário exige nome e sobrenome; o banco cobra o mesmo.
  CONSTRAINT cliente_nome_completo CHECK (length(trim(nome)) > 0 AND position(' ' IN trim(nome)) > 0)
);

CREATE TRIGGER trg_cliente_atualizado_em
  BEFORE UPDATE ON cliente
  FOR EACH ROW EXECUTE FUNCTION fn_tocar_atualizado_em();

COMMENT ON COLUMN cliente.cpf IS
  'Só dígitos, sem máscara. Nulo enquanto o pedido vier do histórico mockado.';

-- -----------------------------------------------------------------------------
-- endereco
-- -----------------------------------------------------------------------------
CREATE TABLE endereco (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID        NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
  cep           TEXT        NOT NULL,
  logradouro    TEXT        NOT NULL,
  numero        TEXT        NOT NULL,
  complemento   TEXT,
  cidade        TEXT        NOT NULL,
  uf            CHAR(2)     NOT NULL,
  principal     BOOLEAN     NOT NULL DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT endereco_cep_digitos CHECK (cep ~ '^[0-9]{8}$'),
  CONSTRAINT endereco_uf_valida CHECK (uf ~ '^[A-Z]{2}$')
);

CREATE TRIGGER trg_endereco_atualizado_em
  BEFORE UPDATE ON endereco
  FOR EACH ROW EXECUTE FUNCTION fn_tocar_atualizado_em();

-- Um endereço principal por cliente. Índice parcial em vez de CHECK porque a
-- regra é entre linhas, não dentro de uma.
CREATE UNIQUE INDEX ux_endereco_principal_por_cliente
  ON endereco (cliente_id) WHERE principal;

CREATE INDEX ix_endereco_cliente ON endereco (cliente_id);

COMMENT ON TABLE endereco IS
  'Endereços de entrega. Nasce vazia no seed: o histórico mockado não tem '
  'endereço — o checkout coletava e descartava.';

INSERT INTO migracao (versao, descricao) VALUES
  ('003', 'Clientes e endereços')
ON CONFLICT (versao) DO NOTHING;
