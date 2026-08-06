# Revisão do esquema contra o front

Feita em 06/08/2026, antes de escrever qualquer endpoint — é mais barato achar
divergência no papel do que com metade da API pronta.

**Método:** percorrer as 15 rotas do front, listar todo dado que cada tela lê ou
escreve, e confirmar campo a campo se o esquema entrega. O que não entregava
virou a migration `011_vitrine.sql`. O que o front faz errado está registrado
aqui, sem ser "corrigido" no banco à revelia.

**Resultado:** o esquema serve as 15 rotas. Três lacunas foram fechadas, seis
problemas do front foram encontrados, e dois pontos precisam de decisão sua
antes da API.

---

## Cobertura por tela

| Rota | Do que precisa | Servido por | |
|---|---|---|---|
| `/` home | itens vendidos 30d, top 5 por giro, 4 maiores descontos, últimas unidades | `fn_resumo_periodo(30).itens`, `fn_vendidos_por_produto(30)`, `produto.desconto_percentual`, `vw_nivel_estoque` | ✅ |
| `/produtos` | filtro categoria/marca/faixa/disponibilidade, 6 ordenações, busca | `produto` + `fn_vendidos_por_produto` + índice trigrama | ✅ |
| `/produtos/[slug]` | ficha, destaques, selos, escassez, vendidos 30d, relacionados | `produto_ficha`, `produto_destaque`, `produto_selo`, `vw_nivel_estoque`, `fn_vendidos_por_produto` | ✅ |
| `/carrinho` | preço, estoque, frete grátis progressivo | `produto`, `parametro.frete_gratis_acima_centavos` | ✅ |
| `/checkout` e `/checkout/[slug]` | dados do cliente, endereço, pagamento, criação do pedido | `cliente`, `endereco`, `fn_finalizar_pedido` | ⚠️ ver "Frete" |
| `/pedido/[id]` | pedido com itens | `pedido` + `item_pedido` | ✅ |
| `/admin/login` | e-mail e senha | `usuario_admin` + `crypt()` | ✅ |
| `/admin` visão geral | KPIs 30d, série diária, top 5, alertas, últimos pedidos | `fn_resumo_comparado`, `fn_serie_diaria`, `fn_ranking_produtos`, `vw_nivel_estoque` | ✅ |
| `/admin/estoque` | lista, filtros, ajuste manual, estoque-alvo | `vw_nivel_estoque`, `fn_ajustar_estoque` | ✅ |
| `/admin/compras` | sugestão por giro, criar, enviar, receber | `fn_cobertura`, `ordem_compra`, `fn_receber_ordem_compra` | ✅ |
| `/admin/vendas` | risco de ruptura, esgotados, receita parada, pedidos recentes | `fn_cobertura`, `vw_nivel_estoque`, `pedido` | ⚠️ ver nota 7 |
| `/admin/financeiro` | receita, CMV, margem, ticket, mensal, pagamentos, contas a pagar, DRE | `fn_resumo_comparado`, `fn_serie_mensal`, `fn_por_forma_pagamento`, `vw_contas_a_pagar`, `vw_valor_estoque` | ⚠️ ver achado 1 |
| `/admin/analytics` | Top 5 com variação de posição, curva, categorias, todos os SKUs | `fn_ranking_produtos`, `fn_serie_diaria`, `fn_receita_por_categoria` | ⚠️ ver achado 2 |

**Depoimentos** (página do produto e checkout direto) **não têm origem no
banco** — ver achado 3.

---

## Lacunas do esquema, fechadas na migration 011

### 1. Desconto percentual não existia
A home escolhe as "Ofertas do dia" pelo maior desconto e o catálogo corta em
15% (`?ofertas=1`). Isso vinha de `descontoPercentual()` no cliente. Repetir a
regra de arredondamento em cada consulta é como a vitrine e o painel passam a
discordar sobre o mesmo produto.

Virou **coluna gerada** `produto.desconto_percentual`, com índice parcial para
o corte de 15%. Coluna gerada não pode divergir do preço. Conferida contra o
front nos 20 produtos.

### 2. O índice de busca cobria menos que a busca
A migration 010 indexava `nome + marca + sku`. Mas o catálogo monta o alvo
assim:

```ts
`${p.nome} ${p.marca} ${p.sku} ${p.resumo} ${p.categoria}`.toLowerCase()
```

Faltavam **`resumo` e a categoria**. Quem buscasse "consoles" ou uma palavra da
descrição acharia na tela e não acharia pelo banco — sem erro, só devolvendo
menos. Índice refeito com a concatenação exata.

> Ficou **sem `unaccent` de propósito**: o front compara só com `toLowerCase()`,
> então "audio" não encontra "Áudio" hoje. A extensão está instalada e pronta.
> Ligar só no banco faria o banco achar o que a tela não acha — é melhoria para
> fazer nas duas pontas juntas.

### 3. Giro por produto exigia a consulta pesada
Home, catálogo, página de produto e checkout direto precisam do mesmo número:
unidades vendidas do SKU na janela. Dava para tirar de `fn_cobertura()`, que
carrega sugestão de compra e cobertura em dias junto. Agora existe
`fn_vendidos_por_produto(dias, ref)`, enxuta, e que devolve **também os produtos
que venderam zero** — sem isso a ordenação perderia item.

---

## Problemas encontrados no front

Nenhum deles foi "consertado" no banco por conta própria. São do front.

### 1. 🔴 O gráfico "Resultado por mês" conta pedido cancelado como receita

`/admin/financeiro` chama:

```ts
mensal: serieMensal(deposito.pedidos, 4, ref)   // lista COMPLETA
```

e `serieMensal()` não filtra status por dentro. Todas as outras chamadas do
painel passam por `noPeriodo()`, que exclui cancelado — **esta é a única que
não passa**.

Consequência: na mesma tela, o KPI "Receita 30 dias" exclui cancelados e o
gráfico logo abaixo os inclui. Medido no seed:

| Mês | O correto | O que a tela mostra | Inflado em |
|---|---|---|---|
| mai/26 | R$ 348.290,85 | R$ 367.439,10 | R$ 19.148,25 |
| jun/26 | R$ 531.207,85 | R$ 545.833,05 | R$ 14.625,20 |
| jul/26 | R$ 631.728,65 | R$ 646.212,80 | R$ 14.484,15 |
| **Total** | | | **R$ 48.257,60** |

O banco segue a regra do prompt e exclui. **Correção sugerida no front:** trocar
por `serieMensal(pedidosValidos(deposito.pedidos), 4, ref)` — uma linha.

> Confissão relevante: a primeira versão do meu teste de paridade **escondia
> isso**, porque eu filtrava os cancelados antes de comparar. O teste passava e
> a divergência ficava invisível. Agora ele mede e imprime o tamanho do bug.

### 2. 🟡 O painel mostra duas receitas diferentes

Já registrado em `ARQUITETURA.md`. Resumo, séries e formas de pagamento usam
`pedido.total` (líquido, com o desconto do Pix). Ranking e receita por categoria
somam preço × quantidade dos itens (**bruto**). Diferença em 90 dias:
**R$ 35.987,95**, exatamente o Pix acumulado.

Piora com um detalhe: o DRE do Financeiro chama a receita **líquida** de
"Receita bruta". Decisão de negócio — ou o ranking rateia o desconto por item,
ou os rótulos passam a dizer qual é qual.

### 3. 🔴 Os depoimentos são fabricados no cliente

`src/lib/depoimentos.ts` gera nome, cidade, nota, data, texto e o selo **"compra
verificada"** a partir de um hash do id do produto. Nada disso vem de cliente
nenhum. `distribuicaoNotas()` inventa a distribuição de estrelas a partir da
média.

Enquanto é demonstração, tudo bem. Publicado com banco real, vira **prova social
inventada exibida a comprador de verdade** — com selo dizendo que a compra foi
verificada.

E colide com o próprio projeto: o brandbook lista o que a marca evita —
*"urgência falsa ('últimas 2 unidades' sem ser verdade). Queima confiança"* — e o
front respeitou isso à risca na escassez (`<AvisoEscassez>` some quando o
estoque está saudável, o número é o mesmo do painel). Os depoimentos ficaram de
fora desse mesmo cuidado.

O banco **não tem** tabela de avaliação escrita: o prompt a excluiu do escopo.
Duas saídas, e ambas são decisão sua:

- **esconder o bloco** até existir avaliação real (uma condicional no front); ou
- **incluir avaliações no escopo** — tabela `avaliacao` com moderação e vínculo
  a pedido, que é o que sustenta o selo "compra verificada".

Enquanto nenhuma das duas acontece, isto **não deve ir ao ar com banco real**.

### 4. 🟡 O hero da home tem data fixa no código

```tsx
Ofertão do dia · 05 de agosto
```

String literal. Em qualquer outro dia a home mente. Deveria sair da data
corrente — e, por causa da hidratação, num efeito, como o `<ContadorOferta>` já
faz.

### 5. 🟡 O produto em destaque da home está preso no código

`produtos.find(p => p.id === "p01")`. Trocar a vitrine exige deploy. Vira
`parametro` (`produto_destaque_home`) ou uma coluna booleana — decisão de
merchandising, não de código.

### 6. 🟡 O id do pedido colide

`BTS-${Date.now()/1000 % 100000}`: dois pedidos no mesmo segundo recebem o mesmo
id, e o ciclo repete a cada ~27 horas. **Já resolvido no banco** por sequência —
mas o front precisa parar de gerar id próprio quando a API entrar.

### 7. ℹ️ "Receita parada" é heurística de tela, não de banco

`/admin/vendas` estima a perda dos esgotados com
`preco × max(1, round(estoqueAlvo × 0,1))`. É chute deliberado e está rotulado
como estimativa. Não virou função SQL: é regra de apresentação, e o lugar dela é
na API. Registrado para não parecer esquecimento.

---

## Dois pontos que precisam de decisão antes da API

### Frete no total do pedido
`fn_finalizar_pedido` **soma frete** ao total, com a regra parametrizada (grátis
acima de R$ 299, senão R$ 29,90). O checkout do front **não soma** — o tipo
`Pedido` do mock nem tem campo de frete; o carrinho apenas exibe.

Ligar o checkout real sem alinhar isso faz o cliente ver um valor no botão e
outro na confirmação. Ou o front passa a exibir o frete no total, ou a função
recebe uma flag para não aplicar.

### Preço sai do cliente
Hoje `finalizarPedido()` recebe o total já calculado pelo navegador.
`fn_finalizar_pedido` recebe **só a lista de itens** e calcula tudo. É a correção
nº 6 do prompt funcionando — mas significa que a assinatura muda, e o front
precisa parar de mandar preço.

---

## Notas de escala

Nada disso é problema com 20 SKUs. Vira problema com 2.000:

- as **contagens dos filtros** do catálogo (por categoria, marca, faixa) são
  calculadas no cliente varrendo a lista inteira. Viram `GROUP BY` na API;
- o catálogo **não pagina** — já está em `TODO.md`;
- `/admin/vendas` e `/admin` cortam os pedidos recentes com `slice(0, 25)` e
  `slice(0, 6)` sobre a lista completa em memória. Viram `LIMIT`.

---

## Estado da verificação

- `npm run paridade` — **873 comparações, 0 divergências** (7/30/90 dias, série
  mensal, cobertura, desconto e giro por produto)
- `vw_conciliacao_estoque` — 0 produtos divergentes
- `testes/fluxo.sql` — 9 etapas, incluindo as 3 que precisam falhar
- `testes/concorrencia.ps1` — 1 venda, 1 recusa, estoque nunca negativo
