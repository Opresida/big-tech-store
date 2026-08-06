# Banco de dados — BIG TECH STORE

PostgreSQL da loja: catálogo, vendas, compras, estoque com livro de
movimentação, e as consultas que o painel administrativo precisa.

Implementa `../web/PROMPT-BANCO-DE-DADOS.md`. O front-end **não foi alterado** —
esta etapa entrega só o banco.

| | |
|---|---|
| Provedor | Neon (org Mazari), projeto `big-tech-store` |
| Versão | PostgreSQL 17 |
| Idioma | pt-BR, `snake_case` |
| Dinheiro | `BIGINT` em centavos, sufixo `_centavos` |

Documentação: **[ARQUITETURA.md](ARQUITETURA.md)** (diagrama ER, decisões e
divergências) · **[MAPEAMENTO.md](MAPEAMENTO.md)** (`tipos.ts` → tabelas) ·
**[REVISAO-FRONT.md](REVISAO-FRONT.md)** (revisão tela a tela, e o que ela
encontrou no front).

---

## Aplicar do zero

```powershell
$env:PGCLIENTENCODING = 'UTF8'
$env:DATABASE_URL = 'postgresql://<usuario>:<senha>@<host>/<banco>?sslmode=require'
$psql = 'C:\Program Files\PostgreSQL\17\bin\psql.exe'

# 1. Migrations, na ordem numérica
Get-ChildItem migrations\*.sql | Sort-Object Name | ForEach-Object {
  & $psql $env:DATABASE_URL -v ON_ERROR_STOP=1 --single-transaction -f $_.FullName
}

# 2. Seed
& $psql $env:DATABASE_URL -v ON_ERROR_STOP=1 --single-transaction -f seed\001_seed.sql
```

Cada migration é idempotente no registro (`INSERT … ON CONFLICT DO NOTHING` em
`migracao`) mas **não** no DDL — rodar duas vezes na mesma base falha em
`CREATE TABLE`. Para conferir o que já foi aplicado:

```sql
SELECT versao, descricao, aplicada_em FROM migracao ORDER BY versao;
```

> **Nunca rode DDL solto.** Mudança de esquema é arquivo novo em `migrations/`,
> numerado na sequência.

---

## O que tem dentro

| Migration | Conteúdo |
|---|---|
| `001_dominios_e_enums` | controle de migrations, enums, `fn_tocar_atualizado_em`, fuso da operação |
| `002_catalogo` | `categoria`, `fornecedor`, `produto`, selos/destaques/ficha, `fn_nivel_estoque` |
| `003_clientes` | `cliente`, `endereco` |
| `004_pedidos` | `pedido`, `item_pedido` |
| `005_compras` | `ordem_compra`, `item_ordem_compra` |
| `006_estoque` | `movimentacao_estoque`, `fn_registrar_movimentacao`, `fn_ajustar_estoque`, `fn_receber_ordem_compra`, `vw_conciliacao_estoque` |
| `007_acesso` | `usuario_admin`, `auditoria` e triggers |
| `008_parametros` | `parametro`, frete, desconto do Pix, `fn_finalizar_pedido` |
| `009_funcoes_gestao` | as consultas do painel |
| `010_indices` | índices de leitura, incluindo busca por trigrama |
| `011_vitrine` | vindas da revisão: `desconto_percentual`, índice de busca com a superfície real, `fn_vendidos_por_produto` |

---

## Consultas da gestão

Todas recebem `(dias, ref)`. `ref` é opcional — sem ela, vale `fn_agora()`.
Todas ignoram pedido cancelado.

```sql
-- KPIs de 30 dias e a variação contra os 30 anteriores
SELECT * FROM fn_resumo_periodo(30);           -- janela atual
SELECT * FROM fn_resumo_periodo(30, NULL, 1);  -- janela anterior
SELECT * FROM fn_resumo_comparado(30);         -- as duas + variação %

-- Top 5 do Analytics, com a posição no período anterior
SELECT * FROM fn_ranking_produtos(90) ORDER BY posicao LIMIT 5;

-- Receita por categoria e por forma de pagamento
SELECT * FROM fn_receita_por_categoria(30);
SELECT * FROM fn_por_forma_pagamento(30);

-- Curvas (dias sem venda vêm com zero, não somem do gráfico)
SELECT * FROM fn_serie_diaria(30);
SELECT * FROM fn_serie_mensal(6);

-- O que acaba primeiro — a consulta central da área de vendas
SELECT * FROM fn_cobertura(30) WHERE dias_cobertura < 7;

-- Estoque e financeiro
SELECT * FROM vw_nivel_estoque WHERE nivel IN ('critico','esgotado');
SELECT * FROM vw_valor_estoque;
SELECT * FROM vw_contas_a_pagar;
SELECT * FROM vw_conciliacao_estoque WHERE diferenca <> 0;  -- tem de vir VAZIO
```

## Operações

```sql
-- Venda. Repare no que NÃO se passa: preço, desconto, frete e total.
SELECT fn_finalizar_pedido(
  'Maria da Silva', 'pix',
  '[{"produto_id": "p17", "quantidade": 3}]'::JSONB,
  'site'
);

-- Recebimento: a única transição que soma unidades
SELECT fn_receber_ordem_compra('OC-2044');

-- Acerto de inventário (grava a diferença e o motivo, não só o número novo)
SELECT fn_ajustar_estoque('p17', 85, 'Contagem de prateleira');

-- Quem está logado, para a trilha de auditoria saber o autor
SELECT set_config('bts.usuario_id', '<uuid-do-usuario>', true);
```

**Nunca faça `UPDATE produto SET estoque = …` direto.** O saldo é derivado do
livro; escrever nele por fora quebra a conciliação e apaga o rastro.

---

## Testes

```powershell
# Paridade com o mock do front — o teste que prova que o banco está certo
$env:DATABASE_URL = '...'
npm install
npm run paridade

# Fluxo ponta a ponta e concorrência — ALTERAM DADOS, use branch descartável
& $psql $env:DATABASE_URL -f testes\fluxo.sql
pwsh testes\concorrencia.ps1
```

`npm run paridade` roda `web/src/lib/metricas.ts` sobre a semente e compara,
número a número, com o retorno das funções SQL para a mesma referência
temporal. **873 comparações, 0 divergências** na última execução.

O teste também imprime o tamanho do bug do gráfico mensal do Financeiro (que
conta pedido cancelado como receita — ver `REVISAO-FRONT.md`). Isso é medição,
não comparação: o banco está certo e o front não.

---

## Regerar o seed

O seed não é escrito à mão: sai do gerador determinístico do próprio front.

```powershell
npm install
npm run seed:gerar   # reescreve seed/001_seed.sql
```

O gerador aborta se o livro de estoque não fechar com o saldo dos produtos — o
arquivo só é escrito quando está consistente.

Conteúdo: 5 categorias, 10 fornecedores, 20 produtos, 20 clientes, 5 usuários
do painel, **517 pedidos** em 90 dias (13 cancelados), 676 itens, 5 ordens de
compra nos três estados e 681 movimentações de estoque.

> O `README.md` e o `CONTEXT.md` do front dizem "~700 pedidos". A semente
> produz **517**. O número correto é 517.

O seed nasce com os quatro níveis de estoque ocupados, para os alertas do painel
aparecerem: 11 saudáveis, 7 baixos, 1 crítico (DualShock 4, 5 de 60) e 1
esgotado (Lenovo IdeaPad 3).

---

## Acesso ao painel

| Campo | Valor |
|---|---|
| E-mail | `admin@bigtechstore.com.br` |
| Senha | `bigtech123` |

Mesma credencial de demonstração do front. O hash é bcrypt de custo 12, gerado
pelo próprio banco no seed. Há um usuário por papel (`estoque@`, `compras@`,
`vendas@`, `financeiro@`), todos com a mesma senha.

> **Troque antes de qualquer uso real.** É credencial de demonstração,
> documentada em público.

---

## Desempenho

Medido com o seed completo (517 pedidos, 676 itens), em `EXPLAIN ANALYZE`:

| Consulta | Execução |
|---|---|
| `fn_serie_diaria(90)` | 19 ms |
| `fn_ranking_produtos(90)` | 22 ms |
| `fn_cobertura(30)` | 0,6 ms |
| `fn_resumo_comparado(90)` | 1,2 ms |

Bem abaixo do limite que justificaria view materializada ou tabela de agregação
diária — o prompt autoriza, mas não é necessário hoje. Revisar quando os
pedidos passarem de ~100 mil.

O tempo total de ida e volta a partir do Brasil fica em ~230–540 ms, quase tudo
latência de rede até `us-west-2`. Se isso incomodar, o caminho é a região do
projeto Neon, não o índice.
