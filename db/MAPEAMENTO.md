# Mapeamento — `src/lib/tipos.ts` → tabelas

De onde cada campo do front veio e no que ele virou. Esta é a tabela de
tradução que a API vai precisar.

Regra geral de dinheiro: **todo `number` de reais virou `BIGINT` de centavos**,
com o sufixo `_centavos`. A conversão é `Math.round(reais * 100)` na ida e
`centavos / 100` na volta. Nunca faça isso com `parseFloat` nem deixe o valor
passar por `float` no caminho.

---

## `Produto` → `produto` (+ 3 tabelas filhas)

| TS | Coluna | Mudou? |
|---|---|---|
| `id` | `produto.id` (TEXT PK) | Não. `p01`…`p20` preservados — o front já os usa |
| `slug` | `produto.slug` UNIQUE | Não |
| `sku` | `produto.sku` UNIQUE | Não |
| `nome` | `produto.nome` | Não |
| `marca` | `produto.marca` | Não |
| `categoria` | `produto.categoria_id` → `categoria(id)` | **Sim** — enum virou FK (correção 3) |
| `forma` | `produto.forma` (enum) | Não |
| `precoDe` | `produto.preco_de_centavos` | **Sim** — float → centavos |
| `preco` | `produto.preco_centavos` | **Sim** — float → centavos |
| `custo` | `produto.custo_centavos` | **Sim** — float → centavos |
| `estoque` | `produto.estoque` | **Sim** — deixou de ser editável direto; agora só muda por `fn_registrar_movimentacao` (correção 5) |
| `estoqueAlvo` | `produto.estoque_alvo` | Não |
| `nota` | `produto.nota` NUMERIC(2,1) | Não |
| `avaliacoes` | `produto.avaliacoes` | Não |
| `selos[]` | `produto_selo (produto_id, selo)` | **Sim** — array virou tabela filha |
| `resumo` | `produto.resumo` | Não |
| `destaques[]` | `produto_destaque (produto_id, ordem, texto)` | **Sim** — array virou tabela, `ordem` preserva a sequência exibida |
| `ficha[]` | `produto_ficha (produto_id, ordem, rotulo, valor)` | **Sim** — idem |
| `fornecedor` | `produto.fornecedor_id` → `fornecedor(id)` | **Sim** — texto virou FK (correção 2) |
| — | `produto.status` | **Novo** — `ativo`/`inativo`/`descontinuado` (correção 8) |
| — | `criado_em`, `atualizado_em` | **Novo** — requisito não funcional |

Para remontar o objeto do front:

```sql
SELECT p.*,
       (SELECT array_agg(selo ORDER BY selo) FROM produto_selo s WHERE s.produto_id = p.id) AS selos,
       (SELECT array_agg(texto ORDER BY ordem) FROM produto_destaque d WHERE d.produto_id = p.id) AS destaques,
       (SELECT jsonb_agg(jsonb_build_object('rotulo', rotulo, 'valor', valor) ORDER BY ordem)
          FROM produto_ficha f WHERE f.produto_id = p.id) AS ficha
  FROM produto p WHERE p.slug = $1;
```

---

## `Categoria` → `categoria`

| TS | Coluna | Mudou? |
|---|---|---|
| `id` | `categoria.id` (TEXT PK) | Não — o slug continua sendo a chave |
| `nome` | `categoria.nome` | Não |
| `descricao` | `categoria.descricao` | Não |
| — | `categoria.ordem` | **Novo** — a ordem de exibição era a do array literal |

---

## `Pedido` → `pedido`

| TS | Coluna | Mudou? |
|---|---|---|
| `id` | `pedido.id` (TEXT PK) | **Sim** — passa a vir de `nextval`, não do relógio do navegador |
| `data` (ISO string) | `pedido.data` TIMESTAMPTZ | **Sim** — string virou timestamp com fuso |
| `cliente` (nome) | `pedido.cliente_nome` + `pedido.cliente_id` → `cliente(id)` | **Sim** — vira FK, mantendo o nome como snapshot (correção 4) |
| `itens[]` | `item_pedido` | **Sim** — array virou tabela |
| `total` | `pedido.total_centavos` | **Sim** — e agora acompanhado de `subtotal_centavos`, `desconto_centavos` e `frete_centavos`, para o total ser conferível (correção 6) |
| `custoTotal` | `pedido.custo_total_centavos` | **Sim** — float → centavos |
| `pagamento` | `pedido.pagamento` (enum) | Não |
| `status` | `pedido.status` (enum) | Não |
| `canal` | `pedido.canal` (enum) | Não |
| — | `pedido.endereco_entrega_id` | **Novo** — o checkout coleta endereço e o mock descartava |

**O total agora é conferível.** No mock, `total` é um número que o cliente
manda pronto. Aqui vale `total = subtotal − desconto + frete`, garantido por
`CHECK`, e quem calcula desconto e frete é o servidor.

---

## `ItemPedido` → `item_pedido`

| TS | Coluna | Mudou? |
|---|---|---|
| `produtoId` | `item_pedido.produto_id` FK | **Sim** — virou FK real, `ON DELETE RESTRICT` |
| `nome` | `item_pedido.nome` | Não — continua snapshot |
| `sku` | `item_pedido.sku` | Não — continua snapshot |
| `quantidade` | `item_pedido.quantidade` | Não |
| `precoUnitario` | `item_pedido.preco_unitario_centavos` | **Sim** — float → centavos |
| `custoUnitario` | `item_pedido.custo_unitario_centavos` | **Sim** — float → centavos |

Restrição nova: `UNIQUE (pedido_id, produto_id)`. O carrinho do front já
agrega quantidade por produto, então isso não muda comportamento — e é o que
faz "número de pedidos" do ranking dar o mesmo resultado contando itens ou
pedidos distintos.

---

## `OrdemCompra` → `ordem_compra`

| TS | Coluna | Mudou? |
|---|---|---|
| `id` | `ordem_compra.id` | **Sim** — `'OC-' || nextval` |
| `data` | `ordem_compra.data` TIMESTAMPTZ | **Sim** |
| `fornecedor` (texto) | `ordem_compra.fornecedor_id` FK | **Sim** (correção 2) |
| `itens[]` | `item_ordem_compra` | **Sim** |
| `total` | `ordem_compra.total_centavos` | **Sim** |
| `status` | `ordem_compra.status` (enum) | Não |
| `previsao` (ISO) | `ordem_compra.previsao` DATE | **Sim** — é data de calendário, não instante |
| `recebidaEm?` | `ordem_compra.recebida_em` | Não, mas agora com `CHECK` amarrando ao status |

---

## `ItemCompra` → `item_ordem_compra`

| TS | Coluna |
|---|---|
| `produtoId` | `item_ordem_compra.produto_id` FK |
| `quantidade` | `item_ordem_compra.quantidade` |
| `custoUnitario` | `item_ordem_compra.custo_unitario_centavos` |

---

## `Deposit` → não existe mais

`{ produtos, pedidos, compras }` era o embrulho do `localStorage`. No banco cada
coleção é uma tabela. A API entrega os três recortes separadamente.

## `ItemCarrinho` → não existe no banco

Carrinho continua no cliente até virar pedido. Se um dia precisar sobreviver
entre dispositivos, vira `carrinho` + `item_carrinho` — não foi criado agora
porque nenhuma tela pede isso.

---

## Tabelas que não têm equivalente no front

| Tabela | Por quê |
|---|---|
| `cliente`, `endereco` | O checkout já coleta e o mock descartava (correção 4) |
| `fornecedor` | Era texto solto (correção 2) |
| `movimentacao_estoque` | O saldo não tinha rastro (correção 5) |
| `usuario_admin` | `entrar()` comparava string no navegador |
| `auditoria` | Não havia registro de quem mudou preço ou estoque |
| `parametro` | Desconto do Pix e frete estavam fixos no código do cliente |
| `migracao` | Controle de versão do próprio esquema |

---

## Substituições em `src/lib/loja.tsx`

O que a API precisa trocar, uma função de cada vez:

| Hoje | Vira |
|---|---|
| `estadoInicial()` (semente) | `GET /produtos`, `/pedidos`, `/compras` |
| `finalizarPedido()` | `SELECT fn_finalizar_pedido($1,$2,$3,$4,$5,$6,$7)` |
| `receberCompra(id)` | `SELECT fn_receber_ordem_compra($1)` |
| `definirEstoque(id, v)` | `SELECT fn_ajustar_estoque($1, $2, $3, $4)` |
| `ajustarEstoque(id, ±1)` | idem, com o saldo já somado |
| `atualizarProduto(id, {estoqueAlvo})` | `UPDATE produto SET estoque_alvo = …` (trigger audita) |
| `criarCompra()` / `enviarCompra()` | `INSERT INTO ordem_compra` / `UPDATE … SET status='enviada'` |
| `entrar(email, senha)` | `POST /auth/login` → `senha_hash = crypt($senha, senha_hash)` + cookie httpOnly |
| `useEffect` de persistência | some |

E as funções de `metricas.ts` passam a ser chamadas SQL — a lista está no
`README.md`.
