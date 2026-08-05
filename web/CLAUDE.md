@AGENTS.md

# BIG TECH STORE — convenções do projeto

Leia `CONTEXT.md` antes de mudar arquitetura e `ESTRUTURA.md` para achar as
coisas. Este arquivo é só o conjunto de regras que o código já segue.

## Regra número um: o brandbook manda

A fonte da verdade visual é `../project/Brandbook.dc.html`. Antes de escolher
uma cor, um tamanho de botão ou um peso de fonte, confira lá. Se for divergir do
manual, divirja de propósito e escreva o porquê num comentário.

Pontos que o manual trava e que já estão implementados:

- **Laranja `#FF6A00` é exclusivo de CTA.** Um só CTA laranja por bloco visível.
  Nunca decorativo, nunca em série de gráfico. Ação secundária é o azul.
- **Botão**: altura 48, raio 10 (`.btn` em `globals.css`). Nada de outro tamanho
  sem motivo — use `.btn-sm` (38px) quando precisar de compacto.
- **Bloco de preço**: hierarquia fixa — preço cheio riscado, preço à vista em
  Archivo Black, Pix em verde (−5%), parcelas em IBM Plex Mono.
- **Barra de estoque**: verde acima de 40% do estoque-alvo, âmbar entre 15–40%,
  vermelho abaixo de 15%. A mesma função (`nivelEstoque`) serve loja e admin —
  não duplique essa lógica.
- **Tipografia**: Archivo Black só em display/manchete (nunca texto corrido),
  Archivo no texto, IBM Plex Mono em SKU, quantidade, código e label de admin.
- **Tom de voz**: direto, sem urgência falsa, sem caixa alta em frase inteira,
  no máximo um ponto de exclamação.

## Idioma

Código em **português**: nomes de arquivo, componentes, variáveis, props e
comentários. Exceções obrigatórias do framework ficam em inglês (`page.tsx`,
`layout.tsx`, `useEffect`, e hooks próprios que precisam começar com `use` por
causa do lint — ex.: `useDataFutura`).

## Estilo

Tailwind v4 com os tokens declarados em `@theme` (`src/app/globals.css`). Use os
nomes semânticos — `bg-noite`, `text-cinza-600`, `border-cinza-200` — nunca hex
solto no JSX. Padrões repetidos (botão, campo, badge, cartão) são classes em
`@layer components`, não cópias de utilitário.

## Responsividade

Mobile-first, sempre. Todo componente novo precisa passar em 390px sem scroll
horizontal. Tabela larga vai dentro de `overflow-x-auto` própria, nunca deixando
a página rolar de lado.

**`min-width: auto` é a armadilha que já quebrou este projeto duas vezes.** Item
de grid ou de flex não encolhe abaixo do conteúdo por padrão. Se ele contém
texto `truncate`, tabela com `min-width` ou SVG medido em px, o filho estica a
coluna e a página inteira sai da tela no celular. Ponha `min-w-0` no item — é
por isso que `<Cartao>` e as colunas dos grids já têm.

Corolário para quem mede largura em px (`useLargura`): **comece estreito e
cresça**. Um valor inicial largo estica o container antes da primeira medição, e
aí o ResizeObserver lê a largura já inflada e nunca se corrige. Ponha também
`overflow-hidden` no wrapper como trava.

Não confie no build nem em uma largura só: verifique em 360, 390 e 1280, e
compare `document.documentElement.scrollWidth` com `clientWidth`.

## Visualização de dados

Regras aplicadas em `src/components/viz/` (método da skill `dataviz`):

- Uma medida por gráfico. **Nunca dois eixos Y.**
- Séries usam `SERIE_1` / `SERIE_2` (dois passos do azul da marca). Verde,
  amarelo e vermelho são **status** e sempre vêm com rótulo em texto, nunca cor
  sozinha.
- Barra ≤ 24px, ponta arredondada em 4px e quadrada na base; linha de 2px;
  marcador ≥ 8px com anel de 2px na cor da superfície; 2px de respiro entre
  faixas empilhadas.
- Grade e eixo são hairline **sólido** (`GRADE`), nunca tracejado.
- Legenda sempre presente com 2+ séries; rótulo direto é seletivo, nunca número
  em cima de todo ponto.
- Todo gráfico oferece `<VerDados>` — o valor jamais fica refém do tooltip.
- SVG acompanha a largura do container via `useLargura` (ResizeObserver). Nada
  de largura fixa.

## Estado e dados

Tudo passa por `useLoja()` (`src/lib/loja.tsx`). Não crie um segundo estado
global, não leia `localStorage` direto na página.

Regras de hidratação, porque o SSR está ligado:

- Nada de `Date.now()`, `new Date()` sem argumento ou `Math.random()` durante a
  renderização. Se precisar do "agora" do navegador, use um efeito
  (`useDataFutura`, `useContagemRegressiva`) e renderize um estado neutro antes.
- Dados de semente têm que ser determinísticos (PRNG com semente fixa em
  `semente.ts`, data-âncora `HOJE` em `catalogo.ts`).
- Use a flag `hidratado` para segurar o que depende de `localStorage` (badge do
  carrinho, guarda do admin).

## Estados de carregamento

Nada de texto solto tipo "Carregando…". Use `<TelaCarregando>` (tela cheia, para
guarda de rota) ou `<BlocoCarregando>` (dentro da página), ambos em
`components/CarregandoMarca.tsx` — símbolo da marca com anel laranja girando.

A duração é **4 segundos exatos**, via `useLoaderComTeto` — mínimo e teto ao
mesmo tempo:

- **Mínimo**, porque a hidratação termina em ~150ms. Sem ele o spinner piscava
  e sumia antes de o olho registrar, e parecia que não tinha entrado.
- **Teto**, porque uma tela girando para sempre não informa nada e parece
  travamento. Estourado o prazo, entra uma mensagem estática no lugar.

`<SplashEntrada>` é a tela de marca ao abrir o site: 4s, **uma vez por sessão**
(marcação em `sessionStorage`). Ela nasce visível já na renderização do
servidor — se aparecesse só depois de montar, o visitante veria a home por um
instante e a splash cairia por cima, pior do que não ter.

## Acessibilidade

Estado nunca é comunicado só por cor — badge de estoque tem bolinha **e** texto,
KPI tem seta **e** número. Todo input tem `<label>` associado; erro usa
`aria-invalid` + `aria-describedby`. Ícone decorativo leva `aria-hidden`. Alvo
de toque com no mínimo 38px.

## Antes de dar por pronto

```bash
npx tsc --noEmit
npx eslint src
npm run build
```

E abra a tela em 1280px e 390px. O build passar não prova que o layout está
certo.
