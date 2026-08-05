# Contexto e decisões

Por que o projeto é assim. Leia antes de mudar arquitetura — várias escolhas
aqui parecem arbitrárias e não são.

---

## De onde isso veio

Bundle de handoff do Claude Design (`claude.ai/design`), na raiz do repositório:

- `project/Brandbook.dc.html` — o manual de marca completo, **fonte da verdade
  visual**.
- `chats/chat1.md` — a conversa que originou a marca.

O projeto foi definido em três etapas na conversa original:

1. **Marca + brandbook** — concluída, é o que veio no bundle.
2. **Site** com admin de estoque — **é o que este repositório entrega**.
3. **Social** — templates de Instagram e X, ainda não iniciada.

O brandbook fecha listando exatamente o escopo desta etapa: *"Home, categoria
com filtros, produto, carrinho, checkout, busca, conta e painel admin de estoque
com alerta de estoque baixo."*

---

## Decisões que o usuário tomou

| Pergunta | Resposta |
|---|---|
| Stack | Next.js + Tailwind |
| Comportamento dos mocks | `localStorage` compartilhado entre todas as telas |

## Decisões que eu tomei (e o motivo)

### Credencial de admin fixa

`admin@bigtechstore.com.br` / `bigtech123`, validada no cliente. Não existe
back-end para autenticar. A tela mostra a credencial e diz que é demonstração —
melhor do que fingir segurança que não existe. Toda a lógica está isolada em
`entrar()` dentro de `loja.tsx`: trocar por uma chamada de API é editar uma
função.

### Placeholder no lugar de foto

O brandbook pede foto 1:1 em fundo branco e o próprio assistente de design
avisou, no fim da conversa: *"me manda as fotos dos produtos em fundo branco e a
lista de preços/parcelamento — senão o site sai com placeholder."* As fotos não
vieram. Em vez de usar imagem genérica de banco, `FotoProduto.tsx` reproduz o
quadro hachurado do manual com uma silhueta geométrica por categoria — fica
claro que é placeholder e o layout já reserva a proporção final.

### Escassez sempre verdadeira

O brandbook lista, no tom de voz, o que a marca **evita**: *"Urgência falsa
('últimas 2 unidades' sem ser verdade). Queima confiança."*

Isso mudou o desenho dos gatilhos. `<AvisoEscassez>` retorna `null` quando o
estoque está saudável e só aparece abaixo de 40% do estoque-alvo; o número que
ele mostra é o mesmo do painel; ao repor pelo admin, o aviso some da loja. O
contador marca o fim real do dia. A prova social conta pedidos reais do
histórico. Nada é constante inventada.

### Um único "banco", não mocks soltos por tela

`localStorage` guarda um objeto `Deposit` com produtos, pedidos e ordens de
compra. Todas as telas leem dele. É o que faz os setores conversarem:

```
Compras: receber ordem  ──soma unidades──►      Produto.estoque
Loja: finalizar pedido  ──baixa unidades──►     Produto.estoque
                        └──cria Pedido──► Vendas · Financeiro · Analytics
```

Sem isso, "Analytics do mais vendido" seria um JSON decorativo. Com isso, uma
compra feita na loja aparece no ranking.

### Semente determinística

Os 90 dias de histórico (~700 pedidos) são gerados por um PRNG com semente fixa
(`mulberry32(20260805)`) e ancorados numa data constante (`HOJE`).

Motivo técnico: o SSR está ligado. Se a semente usasse `Math.random()` ou
`Date.now()`, servidor e cliente produziriam dados diferentes e a hidratação
quebraria. É por isso que `CLAUDE.md` proíbe função impura durante a renderização
— não é preciosismo.

### Estado hidrata por efeito, de propósito

O servidor renderiza a semente; o cliente troca pelo `localStorage` **depois** da
hidratação, dentro de um `useEffect`. Ler o storage durante a renderização
divergiria do HTML do servidor.

O lint `react-hooks/set-state-in-effect` reclama disso. Está desativado
pontualmente nos dois lugares onde acontece, com comentário explicando. É a
exceção clássica da regra (leitura de fonte externa na hidratação), não
desleixo. Se um dia migrar para `useSyncExternalStore`, o disable sai junto.

### Gráficos escritos à mão

Nenhuma biblioteca de charts. Três motivos: o brandbook trava a paleta e a
tipografia, os gráficos são simples (linha, barra, coluna empilhada), e o bundle
fica menor. `src/components/viz/` implementa as regras da skill `dataviz`.

**A paleta de dados foi validada, não escolhida no olho.** O validador da skill
reprovou a primeira tentativa (azul + cinza: o cinza não passa no piso de croma,
lê como grade). O par aprovado é `#0B37D6` + `#7FA0F0` — dois passos do azul da
marca, aprovados em banda de luminosidade, croma, separação para daltonismo
(ΔE 24,7 protan) e contraste. O passo claro fica abaixo de 3:1 no contraste, o
que **obriga** rótulo visível — por isso toda composição empilhada tem legenda e
valor em texto, e todo gráfico tem `<VerDados>`.

O laranja `#FF6A00` ficou fora das séries de propósito: é cor de CTA. Verde,
amarelo e vermelho são status reservados e nunca viram "série 4".

### Categorias como escala sequencial, não categórica

"Receita por categoria" e "formas de pagamento" usam **um tom só**. Cinco hues
diferentes para cinco categorias violaria as cores reservadas do brandbook e não
acrescenta informação — a identidade já está no rótulo da linha. É barra
ranqueada, não série temporal.

---

## O que o back-end vai precisar mexer

O contrato está desenhado para minimizar isso. `src/lib/loja.tsx` é a única
fronteira:

| Hoje | Depois |
|---|---|
| `estadoInicial()` da semente | `GET /produtos`, `/pedidos`, `/compras` |
| `finalizarPedido()` muta estado local | `POST /pedidos` (com validação de estoque no servidor) |
| `receberCompra()` soma no estado local | `POST /compras/:id/receber` |
| `entrar()` compara string | `POST /auth/login` + cookie httpOnly |
| `useEffect` de persistência | some |

Os tipos em `tipos.ts` já são o formato esperado da API. `metricas.ts` é função
pura sobre esses tipos — continua valendo, rodando no cliente ou no servidor.

**Atenção na migração:** o cálculo de total com desconto do Pix (−5%) hoje
acontece no cliente, em dois lugares (`loja.tsx` e `FormularioCheckout.tsx`).
Preço nunca deve ser decidido pelo cliente — isso vai para o servidor.

---

## Estado da verificação

Rodado neste build:

- `npx tsc --noEmit` — limpo.
- `npx eslint src` — limpo.
- `npm run build` — 15 rotas, sem erro.
- Todas as páginas abertas em 1280px e 390px: sem erro de console, sem scroll
  horizontal.
- Fluxo ponta a ponta: vender 3 DualSense levou o estoque de 88 → 85, o pedido
  apareceu em `/admin/vendas`, e receber a OC-2044 somou 60 un. ao DualShock 4
  (5 → 65).

Não há testes automatizados no repositório. Está em `TODO.md`.
