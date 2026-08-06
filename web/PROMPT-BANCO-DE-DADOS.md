# Prompt — Banco de dados da BIG TECH STORE

Este arquivo **é o prompt**. Copie do bloco "PROMPT" até o fim e entregue a quem
vai construir o banco (pessoa ou IA). Ele foi escrito a partir do código real do
front-end deste repositório, não de suposições.

**Parâmetro que talvez você queira trocar:** o prompt assume **PostgreSQL**. Se
for usar outro banco, altere só a linha marcada com `<<TROQUE AQUI>>`.

---

# PROMPT

## Contexto

Você vai projetar e implementar o banco de dados da **BIG TECH STORE**, uma loja
virtual brasileira de eletrônicos, games e informática (consoles, celulares,
notebooks, áudio e acessórios). O posicionamento da marca é "o melhor preço do
Brasil", 100% online, com entrega para todo o país.

O **front-end já existe e está pronto**, em Next.js 16 + React 19 + TypeScript,
com dados mockados em `localStorage`. Seu banco precisa sustentar exatamente o
que essa interface já faz — sem que ela precise ser reescrita. O foco desta
etapa é a **área de gestão** (painel administrativo), mas o banco também guarda
o que a loja grava, porque é a venda que alimenta a gestão.

**Banco: PostgreSQL 16.** `<<TROQUE AQUI>>`

Idioma do domínio: **português**. Tabelas, colunas e enums em pt-BR, snake_case
(`ordem_compra`, `custo_unitario`, `estoque_alvo`). O front-end usa esses nomes,
e traduzir só cria atrito.

---

## O que o painel administrativo faz hoje

Seis telas, todas já implementadas. O banco precisa responder a cada uma delas.

### 1. Login (`/admin/login`)
Autenticação por e-mail e senha. Hoje é mockada no cliente.

### 2. Controle de estoque (`/admin/estoque`)
Lista de produtos com quantidade, estoque-alvo editável, barra de nível, filtro
por status e por categoria, busca por nome/SKU/marca. Permite ajuste manual de
quantidade (acerto de inventário) e edição do estoque-alvo.

### 3. Setor de compras (`/admin/compras`)
Controla **tudo que entra no estoque**. Sugestão automática de reposição pelo
giro, criação de ordem de compra, envio ao fornecedor e recebimento. **A
mercadoria só é somada ao estoque quando a ordem é marcada como recebida.**

### 4. Área de vendas (`/admin/vendas`)
Mostra o que está acabando **antes** de esgotar: risco de ruptura por cobertura
em dias, SKUs esgotados, receita parada, e a lista de pedidos recentes.

### 5. Financeiro (`/admin/financeiro`)
Receita, custo da mercadoria vendida (CMV), margem bruta, ticket médio,
resultado por mês, recebimento por forma de pagamento, contas a pagar (ordens de
compra ainda não recebidas) e um demonstrativo simplificado. Filtros de 7, 30 e
90 dias.

### 6. Analytics (`/admin/analytics`)
Ranking dos mais vendidos com **Top 5 em destaque** e variação de posição contra
o período anterior, curva de receita diária, receita por categoria e desempenho
de todos os SKUs. Filtros de 7, 30 e 90 dias.

---

## Entidades que o front-end já usa

Estes são os tipos TypeScript reais (`src/lib/tipos.ts`). Modele-os no banco,
**corrigindo os problemas apontados na seção "Correções obrigatórias"**.

```ts
type Produto = {
  id: string;
  slug: string;              // único, usado na URL
  sku: string;               // único
  nome: string;
  marca: string;
  categoria: "consoles" | "celulares" | "notebooks" | "audio" | "acessorios";
  forma: "console" | "celular" | "notebook" | "audio" | "controle";
  precoDe: number;           // preço cheio, riscado na vitrine
  preco: number;             // preço à vista praticado
  custo: number;             // custo de aquisição — base da margem
  estoque: number;
  estoqueAlvo: number;       // base da barra de nível
  nota: number;              // média das avaliações
  avaliacoes: number;        // quantidade de avaliações
  selos: ("lancamento" | "frete-gratis" | "mais-vendido")[];
  resumo: string;
  destaques: string[];       // bullets da página do produto
  ficha: { rotulo: string; valor: string }[];  // ficha técnica
  fornecedor: string;
};

type ItemPedido = {
  produtoId: string;
  nome: string;              // snapshot
  sku: string;               // snapshot
  quantidade: number;
  precoUnitario: number;     // snapshot — NÃO é o preço atual do produto
  custoUnitario: number;     // snapshot
};

type Pedido = {
  id: string;
  data: string;              // ISO
  cliente: string;           // hoje só o nome
  itens: ItemPedido[];
  total: number;
  custoTotal: number;
  pagamento: "pix" | "credito" | "boleto";
  status: "aprovado" | "processando" | "cancelado";
  canal: "site" | "checkout-direto";
};

type ItemCompra = { produtoId: string; quantidade: number; custoUnitario: number };

type OrdemCompra = {
  id: string;
  data: string;
  fornecedor: string;
  itens: ItemCompra[];
  total: number;
  status: "rascunho" | "enviada" | "recebida";
  previsao: string;          // data prevista de entrega
  recebidaEm?: string;
};
```

---

## Correções obrigatórias em relação ao front-end

O mock tomou atalhos que **não podem ir para o banco**. Corrija cada um:

1. **Dinheiro nunca como float.** O front usa `number` (ponto flutuante), o que
   já produz erro de arredondamento no desconto do Pix. No banco use
   **`BIGINT` em centavos** (preferido) ou `NUMERIC(12,2)`. Nunca `REAL` ou
   `DOUBLE PRECISION`.

2. **Fornecedor vira tabela.** Hoje é texto solto no produto e na ordem de
   compra. Crie `fornecedor` com CNPJ, contato e prazo médio de entrega.

3. **Categoria vira tabela.** Hoje é enum fixo no código, com nome e descrição
   codificados. Mantenha o slug (`consoles`, `celulares`…) como chave estável.

4. **Cliente vira tabela.** Hoje o pedido guarda só o nome. Precisa de CPF,
   e-mail, telefone e endereços — o checkout já coleta todos esses campos
   (nome, e-mail, CPF, telefone, CEP, endereço, número, complemento, cidade,
   UF).

5. **Estoque precisa de razão, não só de saldo.** Hoje `produto.estoque` é um
   número que alguém soma e subtrai, sem rastro. Crie um **livro de movimentação
   de estoque** (entrada por compra, saída por venda, ajuste de inventário,
   devolução), com autor, motivo, documento de origem e timestamp. O saldo deve
   ser conciliável a partir do livro.

6. **Preço nunca é decidido pelo cliente.** O desconto de 5% no Pix e o
   parcelamento em 12x hoje são calculados no navegador. Isso vai para o
   servidor/banco.

7. **Snapshot de preço e custo no item do pedido é regra, não conveniência.**
   Se o preço do produto mudar amanhã, a margem histórica **não pode mudar
   junto**. O front já faz isso; o banco precisa garantir.

8. **Produto não se apaga.** Use status (`ativo`, `inativo`, `descontinuado`) ou
   soft delete. Apagar quebraria o histórico de vendas.

---

## Regras de negócio que o banco precisa garantir

Estas regras vêm do brandbook e do código, e são o coração da gestão.

### Níveis de estoque (usados na loja E no painel — regra única)
Sobre a razão `estoque / estoque_alvo`:

| Nível | Condição | Cor |
|---|---|---|
| Esgotado | `estoque <= 0` | cinza |
| Crítico | `< 15%` do alvo | vermelho |
| Baixo | `15% a 40%` | âmbar |
| Saudável | `> 40%` | verde |

### Fluxo de estoque
```
Ordem de compra RECEBIDA  ──soma unidades──►  saldo do produto
Pedido APROVADO           ──baixa unidades──►  saldo do produto
                          └──alimenta──► vendas, financeiro e analytics
```
Ordem em rascunho ou enviada **não** mexe no estoque. Só o recebimento move.

### Pagamento
- Pix: **5% de desconto** sobre o preço à vista.
- Cartão: até **12x sem juros**.
- Boleto: valor cheio.

### Frete (regra atual, provisória)
Grátis acima de R$ 299; abaixo disso, R$ 29,90 fixo. Deixe parametrizável.

### Pedidos cancelados
**Não entram** em nenhum cálculo de receita, custo, margem, ranking ou giro.

---

## Consultas que a gestão precisa responder

Implemente como views, funções ou procedures — mas precisam existir e ser
rápidas. Todas aceitam uma **janela de dias** (7, 30 ou 90) e comparam com o
**período imediatamente anterior de mesmo tamanho**.

### Resumo do período
`receita`, `custo`, `margem` (receita − custo), `margem_percentual`,
`quantidade_pedidos`, `quantidade_itens`, `ticket_medio` (receita ÷ pedidos).
Mais a **variação percentual** de cada um contra o período anterior.

### Ranking de produtos
Por **unidades vendidas**, com `receita`, `margem`, `margem_percentual`,
`share_de_unidades` e número de pedidos. Precisa também da **posição no período
anterior**, para calcular se o produto subiu ou caiu no ranking. O Top 5 é o
destaque da tela, mas a lista completa é exibida abaixo.

### Receita por categoria
Soma de `preco_unitario × quantidade` agrupada por categoria, com percentual do
total.

### Recebimento por forma de pagamento
Valor total e quantidade de pedidos por Pix / crédito / boleto, com percentual.

### Série diária
Um ponto por dia da janela, com `receita` e `quantidade_pedidos`. Dias sem venda
aparecem com zero (não podem sumir do gráfico).

### Série mensal
Um ponto por mês, com `receita`, `custo`, `margem` e `quantidade_pedidos`. O mês
corrente é parcial.

### Cobertura de estoque (giro) — a consulta mais importante da área de vendas
Por produto:
- `vendidos_30` — unidades vendidas na janela
- `media_diaria` = `vendidos_30 ÷ dias_da_janela`
- `dias_cobertura` = `estoque ÷ media_diaria` (infinito quando não há giro)
- `sugestao_compra` = `max(0, max(ceil(media_diaria × 45), estoque_alvo) − estoque)`

Ordenar do que acaba primeiro. Menos de 7 dias é crítico; menos de 21 é alerta.

### Valor de estoque
- A custo: `Σ(estoque × custo)` — capital imobilizado
- A preço de venda: `Σ(estoque × preco)` — potencial de receita

### Contas a pagar
Ordens de compra com status diferente de `recebida`, com valor e data prevista.

---

## Acesso e papéis

Crie usuários administrativos com papéis, porque os setores são distintos:

| Papel | Acesso |
|---|---|
| `admin` | tudo |
| `estoque` | estoque e movimentação |
| `compras` | ordens de compra, fornecedores, e leitura do estoque |
| `vendas` | pedidos, cobertura, e leitura do estoque |
| `financeiro` | receita, custo, margem, contas a pagar |

Senha com hash forte (Argon2id ou bcrypt), nunca em texto. Registre último
acesso. Toda alteração sensível (preço, custo, ajuste de estoque, recebimento de
ordem) precisa de **trilha de auditoria** com autor, valor anterior, valor novo
e timestamp.

---

## Requisitos não funcionais

- **Fuso horário**: armazene em `TIMESTAMPTZ` (UTC). A operação e os relatórios
  são em `America/Sao_Paulo` — as janelas de 7/30/90 dias e o agrupamento
  mensal precisam bater com o dia civil brasileiro, não com o UTC.
- **Índices**: no mínimo em `pedido(data)`, `pedido(status)`,
  `item_pedido(produto_id)`, `produto(slug)`, `produto(sku)`,
  `movimentacao_estoque(produto_id, criado_em)`. As telas cruzam 90 dias de
  pedidos com 20+ SKUs a cada carregamento.
- **Agregados**: se a série diária de 90 dias ficar lenta, proponha uma view
  materializada ou tabela de agregação diária, com estratégia de atualização.
- **Concorrência**: dois clientes não podem comprar a última unidade. Descreva
  a estratégia (reserva no checkout, `SELECT … FOR UPDATE`, ou constraint que
  impeça saldo negativo).
- **Integridade**: chaves estrangeiras com a ação de exclusão pensada; `CHECK`
  para quantidade ≥ 0, preço ≥ 0 e estoque ≥ 0.
- **Timestamps**: `criado_em` e `atualizado_em` em todas as tabelas.
- **Migrations versionadas**, nunca DDL solto.

---

## Dados de exemplo

Inclua um seed com o catálogo real do front-end: **20 produtos** em 5 categorias
(consoles, celulares, notebooks, áudio, acessórios) — PS5 Slim, PS5 Pro, Xbox
Series X, iPhone 15, Galaxy S24, Redmi Note 13 Pro, MacBook Air M3, Notebook
Gamer Nitro V15, JBL Boombox 3, JBL Charge 5, controles DualSense e DualShock 4,
entre outros — mais **10 fornecedores**, um histórico de **90 dias de pedidos**
e **5 ordens de compra** em estados diferentes (rascunho, enviada, recebida).

O seed precisa produzir um painel que já mostre algo: SKUs em nível saudável,
baixo, crítico e esgotado, para que os alertas apareçam.

---

## O que entregar

1. **Diagrama ER** (texto ou Mermaid) com as tabelas e relacionamentos.
2. **Migrations SQL** versionadas, comentadas, prontas para rodar.
3. **Views/funções** para cada consulta da seção "Consultas que a gestão precisa
   responder", com a assinatura e um exemplo de chamada.
4. **Seed** conforme acima.
5. **Tabela de mapeamento** entre os tipos TypeScript do front-end
   (`src/lib/tipos.ts`) e as tabelas do banco — incluindo o que mudou e por quê.
6. **Nota sobre as decisões**: onde você divergiu deste prompt e o motivo.

## O que não fazer

- Não traduza os nomes do domínio para inglês.
- Não use float para dinheiro.
- Não apague produto, pedido ou ordem de compra fisicamente.
- Não confie em valor de preço vindo do cliente.
- Não permita que uma ordem de compra em rascunho altere o estoque.
- Não invente campo que nenhuma tela consome — se algo for adição sua, marque
  como extensão e justifique.

# FIM DO PROMPT

---

## Notas para você (não fazem parte do prompt)

**Por que este prompt é longo.** Prompt curto de banco de dados devolve um
esquema genérico de e-commerce que não sustenta o painel. As consultas de
cobertura, ranking com posição anterior e série diária com dias zerados são
específicas do que já está construído — se não estiverem escritas, não vêm.

**As 8 correções obrigatórias são a parte que mais importa.** São dívidas reais
do mock, principalmente as três primeiras: dinheiro em float, fornecedor como
texto e estoque sem livro de movimentação. Se o banco nascer com elas, você
carrega o problema para produção.

**O que ainda vai faltar depois deste banco**, e que não entrou de propósito
para não inchar o escopo: cupons de desconto, lista de desejos, avaliações
escritas por clientes com moderação, preço de atacado para revendedor, e a
integração com gateway de pagamento e transportadora. Estão registrados no
`TODO.md`.
