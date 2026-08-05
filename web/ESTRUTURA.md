# Estrutura do projeto

Mapa de onde cada coisa mora e por quê. Se você não sabe onde mexer, comece
aqui.

```
web/
├── README.md          visão geral, rotas, como rodar
├── CLAUDE.md          convenções que o código segue (para agentes)
├── ESTRUTURA.md       este arquivo
├── CONTEXT.md         decisões de arquitetura e os porquês
├── TODO.md            o que falta
└── src/
    ├── app/           rotas (App Router)
    ├── components/    UI reutilizável
    └── lib/           dados, regras de negócio e estado
```

---

## `src/app` — rotas

Dois grupos de rota. Grupo entre parênteses **não** aparece na URL; serve só
para dar um layout diferente a um conjunto de páginas.

```
app/
├── layout.tsx                     raiz: fontes (Archivo/Archivo Black/Plex Mono)
│                                  + <LojaProvider> que embrulha tudo
├── globals.css                    tokens do brandbook em @theme + classes base
│                                  (.btn, .campo, .badge, .cartao, .hachura)
│
├── (loja)/                        ── VITRINE ──
│   ├── layout.tsx                 Cabeçalho + Rodapé
│   ├── page.tsx                       /                     home
│   ├── produtos/page.tsx              /produtos             catálogo + filtros
│   ├── produtos/[slug]/page.tsx       /produtos/:slug       página de produto
│   ├── checkout/page.tsx              /checkout             checkout do carrinho
│   ├── checkout/[slug]/page.tsx       /checkout/:slug       checkout por produto
│   ├── carrinho/page.tsx              /carrinho             carrinho
│   └── pedido/[id]/page.tsx           /pedido/:id           confirmação
│
└── admin/                         ── PAINEL ──
    ├── login/page.tsx                 /admin/login          fora da guarda
    └── (painel)/                      protegido pela guarda de sessão
        ├── layout.tsx             redireciona pro login se não autenticado
        ├── page.tsx                   /admin                visão geral
        ├── estoque/page.tsx           /admin/estoque        controle de estoque
        ├── compras/page.tsx           /admin/compras        setor de compras
        ├── vendas/page.tsx            /admin/vendas         área de vendas
        ├── financeiro/page.tsx        /admin/financeiro     financeiro
        └── analytics/page.tsx         /admin/analytics      analytics + Top 5
```

O login fica **fora** de `(painel)` de propósito: se estivesse dentro, o layout
de guarda redirecionaria a própria tela de login em loop.

Quase toda página é `"use client"` — elas leem o estado mockado do
`localStorage`. Quando o back-end entrar, as leituras viram Server Components e
só a camada de acesso muda.

---

## `src/components` — UI

### Raiz — usados nos dois lados

| Arquivo | O que faz |
|---|---|
| `Marca.tsx` | `<Simbolo>` (chevrons duplos) e `<Logo>`, nas variantes azul / branca / mono do brandbook |
| `FotoProduto.tsx` | Placeholder 1:1 hachurado com silhueta por categoria. **Some quando as fotos reais chegarem** |
| `Precos.tsx` | `<PrecoDisplay>` e `<BlocoPreco>` (riscado → display → Pix verde → parcelas em mono) |
| `Estoque.tsx` | `<BadgeEstoque>` e `<BarraEstoque>`, ambos derivados de `nivelEstoque()` |
| `Estrelas.tsx` | Nota em estrelas com contagem e texto para leitor de tela |
| `CardProduto.tsx` | Card da vitrine: selos, preço, status de estoque, adicionar/comprar |
| `CarregandoMarca.tsx` | `<SplashEntrada>` (3s, 1x por sessão), `<TelaCarregando>`, `<BlocoCarregando>`, `<SpinnerMarca>` e o hook `useLoaderComTeto` |

### `components/loja` — vitrine

| Arquivo | O que faz |
|---|---|
| `Cabecalho.tsx` | Faixa de confiança, busca, carrinho com contador, nav de categorias, menu mobile |
| `Rodape.tsx` | Garantias, categorias, atendimento, faixa tricolor da marca |
| `Gatilhos.tsx` | `<ContadorOferta>`, `<AvisoEscassez>`, `<ProvaSocial>`, `<SelosConfianca>` + hooks `useContagemRegressiva` e `useDataFutura` |
| `Depoimentos.tsx` | Resumo de notas com distribuição + cards de depoimento |
| `FormularioCheckout.tsx` | Formulário completo (dados, entrega, pagamento) com validação e criação do pedido |

### `components/admin`

| Arquivo | O que faz |
|---|---|
| `Navegacao.tsx` | Barra lateral (desktop) / barra superior rolável (mobile) com contadores de alerta, e `<TituloPagina>` |

### `components/viz` — visualização de dados

Sem biblioteca. Todos responsivos.

| Arquivo | O que faz |
|---|---|
| `base.tsx` | Paleta de dados validada (`SERIE_1`, `SERIE_2`, `GRADE`), hook `useLargura` (ResizeObserver), `<Legenda>`, `<VerDados>` (tabela acessível), `<Cartao>` |
| `Kpi.tsx` | Stat tile com variação percentual e tom (neutro/positivo/atenção/crítico) |
| `GraficoLinha.tsx` | Série temporal em SVG: linha 2px, área discreta, crosshair, tooltip, ponto final destacado |
| `GraficoBarras.tsx` | Barras horizontais ranqueadas em HTML — usado no Top 5, categorias e formas de pagamento |
| `GraficoColunas.tsx` | Colunas empilhadas (custo + margem = receita) com 2px de respiro entre faixas |

---

## `src/lib` — dados e regras

| Arquivo | Responsabilidade |
|---|---|
| `tipos.ts` | Todos os tipos: `Produto`, `Pedido`, `OrdemCompra`, `Deposit`… |
| `catalogo.ts` | 20 produtos mockados, 5 categorias, fornecedores, pesos de venda e a data-âncora `HOJE` |
| `semente.ts` | PRNG determinístico + geração de 90 dias de pedidos e das ordens de compra iniciais |
| `loja.tsx` | **Coração do estado.** Contexto com depósito, carrinho, sessão admin e todas as ações. Persiste em `localStorage` |
| `estoque.ts` | `nivelEstoque()` e derivados — a regra 40%/15% do brandbook, uma vez só |
| `formato.ts` | Moeda BRL, percentual, datas, Pix (−5%), parcelamento (12x) |
| `metricas.ts` | Tudo que é cálculo de painel: `resumo`, `ranking`, `cobertura`, `serieDiaria`, `serieMensal`, `variacao`… |
| `depoimentos.ts` | Depoimentos determinísticos por produto + distribuição de notas |

### Dependências entre camadas

```
app/  ──►  components/  ──►  lib/
                     └──────────┘
```

`lib` não importa de `components` nem de `app`. `metricas.ts` não conhece React
— é função pura, testável isoladamente.

---

## Chaves de armazenamento

| Chave | Onde | O que guarda |
|---|---|---|
| `bts.loja.v1` | `localStorage` | Depósito (produtos, pedidos, compras) + carrinho |
| `bts.admin.v1` | `sessionStorage` | Sessão do admin (`"1"` quando logado) |
| `bts.splash.v1` | `sessionStorage` | Marca que a splash de entrada já rodou nesta sessão |

Mudou o formato dos dados? Suba a versão da chave para não quebrar quem já tem
estado salvo no navegador.
