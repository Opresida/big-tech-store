# BIG TECH STORE — Front-end

Loja virtual completa de eletrônicos, games e informática, com painel
administrativo. **Etapa 2** do projeto: apenas front-end, com dados mockados.
O back-end entra na sequência sem que a interface precise ser reescrita.

Implementado a partir do brandbook exportado do Claude Design
(`../project/Brandbook.dc.html`) — paleta, tipografia, botões, badges, bloco de
preço e card de produto seguem o manual à risca.

---

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build && npm start   # produção
npx eslint src               # lint
npx tsc --noEmit             # typecheck
```

## Acesso ao painel administrativo

| Campo | Valor |
|---|---|
| URL | `/admin/login` |
| E-mail | `admin@bigtechstore.com.br` |
| Senha | `bigtech123` |

Autenticação mockada no front (`src/lib/loja.tsx`). A sessão fica em
`sessionStorage`; o back-end assume essa validação depois.

---

## Rotas

### Loja

| Rota | O que é |
|---|---|
| `/` | Home: hero com contador, categorias, ofertas do dia, top 5 mais vendidos, últimas unidades, promessa/prova |
| `/produtos` | Catálogo com filtro divisor (categoria, marca, faixa de preço, disponibilidade) + 6 ordenações |
| `/produtos/[slug]` | Página de produto: ficha técnica, bloco de preço, escassez real, prova social, depoimentos, relacionados |
| `/checkout/[slug]` | **Checkout por produto** — página de conversão de um item só, com depoimentos, prova social e gatilhos de urgência/escassez |
| `/carrinho` | Carrinho com quantidade, frete grátis progressivo e resumo |
| `/checkout` | Checkout do carrinho completo |
| `/pedido/[id]` | Confirmação do pedido |

Aceita query string: `/produtos?categoria=consoles`, `/produtos?busca=ps5`,
`/produtos?ofertas=1`.

### Administração

| Rota | O que é |
|---|---|
| `/admin/login` | Tela de login |
| `/admin` | Visão geral: KPIs, receita diária, top 5, alertas de estoque, compras em aberto, últimos pedidos |
| `/admin/estoque` | Controle de estoque: quantidade por SKU, estoque-alvo editável, barra de nível, filtros e busca |
| `/admin/compras` | Setor de compras: sugestão de reposição por giro, criação de ordem, envio e **recebimento** (o que dá entrada no estoque) |
| `/admin/vendas` | Área de vendas: risco de ruptura por cobertura em dias, esgotados, receita parada, pedidos recentes |
| `/admin/financeiro` | Receita, CMV, margem, resultado por mês, formas de pagamento, contas a pagar, DRE simplificado |
| `/admin/analytics` | **Ranking Top 5** com variação de posição, curva de receita, receita por categoria, desempenho de todos os SKUs |

---

## Como os dados se comportam

Não há back-end. Existe **um único "banco" mockado** em `localStorage`
(`bts.loja.v1`) compartilhado por toda a aplicação, então as telas conversam de
verdade:

```
Compras (receber ordem)  ──soma──►  Estoque
Loja (finalizar pedido)  ──baixa──►  Estoque
                          └──alimenta──►  Vendas · Financeiro · Analytics
```

Verificado ponta a ponta: vender 3 controles DualSense levou o estoque de 88
para 85 e o pedido apareceu em `/admin/vendas`; receber a ordem OC-2044 somou 60
unidades ao DualShock 4 (5 → 65).

O histórico inicial (90 dias, ~700 pedidos) é gerado por um PRNG determinístico
com semente fixa — sai idêntico no servidor e no cliente, sem divergência de
hidratação. Para voltar ao estado original, limpe o `localStorage` do domínio.

---

## Honestidade dos gatilhos

O brandbook é explícito no tom de voz: *"EVITAMOS urgência falsa ('últimas 2
unidades' sem ser verdade). Queima confiança."*

Por isso todo gatilho de escassez lê o estoque real do mock — o aviso só aparece
abaixo de 40% do estoque-alvo, some quando o produto é reposto, e o número
exibido é o mesmo que o admin enxerga. Os contadores marcam o fim real do dia e
reiniciam à meia-noite. A prova social sai do histórico de pedidos.

---

## Pendências conhecidas

- **Fotos dos produtos**: o brandbook pede foto 1:1 em fundo branco. Como elas
  ainda não existem, cada produto usa o placeholder hachurado do próprio manual
  com uma silhueta geométrica da categoria (`FotoProduto.tsx`).
- **Preços e parcelamento**: valores plausíveis, não os reais.
- Detalhes do que falta em `TODO.md`.

Documentação complementar: `CLAUDE.md` (convenções para agentes),
`ESTRUTURA.md` (mapa de arquivos), `CONTEXT.md` (decisões e porquês),
`TODO.md` (próximos passos).
