# TODO

Estado em 05/08/2026. Etapa 2 (site) entregue no front; back-end é a próxima
frente.

---

## ✅ Entregue

### Loja
- [x] Home estruturada: hero com contador, categorias, ofertas do dia, top 5,
      últimas unidades, promessa/prova
- [x] Catálogo com filtro divisor (categoria, marca, faixa de preço,
      disponibilidade) e 6 ordenações
- [x] Busca por nome, marca, SKU e descrição
- [x] Página de produto com ficha técnica, bloco de preço e relacionados
- [x] Carrinho com quantidade, frete grátis progressivo e resumo
- [x] Checkout do carrinho
- [x] **Checkout por produto** (`/checkout/:slug`)
- [x] Depoimentos com distribuição de notas e selo de compra verificada
- [x] Prova social a partir do histórico real de pedidos
- [x] Gatilhos de urgência (contador) e escassez (estoque real)
- [x] Confirmação de pedido

### Administração
- [x] Tela de login
- [x] Visão geral com KPIs e alertas
- [x] Controle de estoque com estoque-alvo editável e barra de nível
- [x] Setor de compras: sugestão por giro, ordem, envio e recebimento
- [x] Área de vendas: risco de ruptura por cobertura em dias
- [x] Financeiro: receita, CMV, margem, mensal, formas de pagamento, contas a
      pagar, DRE simplificado
- [x] Analytics com **ranking Top 5** e variação de posição

### Transversal
- [x] Design system do brandbook em tokens
- [x] Responsivo — loja e painel verificados em 360px, 390px, 414px, 768px e
      1280px, tela por tela, medindo overflow real no navegador
- [x] Loader com a marca (anel laranja + símbolo), teto de 4s
- [x] Componentes de visualização próprios, responsivos, com tabela acessível
- [x] `netlify.toml` na raiz, com build reproduzido a partir do lockfile
- [x] Favicon oficial (SVG + ICO + apple-icon) e card Open Graph da marca
- [x] Metadata OG/Twitter, com título e preço por produto
- [x] `robots.txt` e `sitemap.xml` (27 URLs)

---

## 🔴 Bloqueado — depende de você

- [ ] **Fotos dos produtos** em fundo branco, 1:1. É o que o brandbook pede e o
      que falta para o site sair do placeholder. Assim que chegarem, trocar
      `FotoProduto.tsx` por `next/image` (o layout já reserva a proporção).
- [ ] **Lista real de preços, custos e parcelamento.** Hoje `catalogo.ts` tem
      valores plausíveis, não os seus. O custo alimenta a margem do Financeiro —
      com número errado, o painel mente.
- [ ] Dados cadastrais reais para o rodapé: CNPJ, endereço, telefone, e-mail.
- [ ] Política de frete de verdade (hoje: grátis acima de R$ 299, senão
      R$ 29,90 fixo).

---

## 🟡 Próxima etapa — back-end

Ordem sugerida.

1. [ ] **Modelo de dados e API** seguindo `src/lib/tipos.ts`
       (produtos, pedidos, ordens de compra).
2. [ ] **Autenticação real** do admin: sessão em cookie httpOnly, papéis
       (estoque / compras / vendas / financeiro), troca de senha.
       Substituir `entrar()` em `loja.tsx`.
3. [ ] **Mover o cálculo de preço para o servidor.** Hoje o desconto do Pix
       (−5%) é calculado no cliente — nunca confie no cliente para preço.
4. [ ] **Reserva de estoque no checkout**, com trava contra venda concorrente do
       último item. Hoje a checagem é otimista.
5. [ ] Gateway de pagamento (Pix + cartão) e webhook de confirmação.
6. [ ] Cálculo de frete por CEP e autopreenchimento de endereço (ViaCEP).
7. [ ] Emissão de nota fiscal e código de rastreio.
8. [ ] Migrar as páginas de leitura para Server Components — a camada de acesso
       muda, a UI não.

---

## 🟢 Melhorias da loja

- [ ] Conta do cliente: cadastro, login, histórico de pedidos, endereços
      salvos (estava no escopo do brandbook, ficou fora desta entrega)
- [ ] Lista de desejos e comparador de produtos (o brandbook já tem o botão
      "Comparar" no UI system)
- [ ] Avisar por e-mail quando produto esgotado voltar
- [ ] Cupom de desconto (a paleta já reserva o amarelo para isso)
- [ ] Galeria com múltiplas fotos e zoom
- [ ] Avaliações escritas pelo cliente, com moderação
- [ ] Paginação ou scroll infinito no catálogo (hoje mostra tudo — funciona com
      20 SKUs, não com 2.000)
- [ ] Preço por atacado / revendedor — público citado no brandbook

## 🟢 Melhorias do painel

- [ ] CRUD de produto (hoje só edita estoque, estoque-alvo e preço)
- [ ] Histórico de movimentação de estoque, com autor e motivo do ajuste
- [ ] Exportar relatórios em CSV/PDF
- [ ] Cadastro de fornecedores com prazo médio de entrega
- [ ] Alerta automático de reposição (e-mail/WhatsApp) ao cruzar o limite
- [ ] Financeiro completo: despesas operacionais, fluxo de caixa, DRE de
      verdade
- [ ] Analytics: funil de conversão, origem de tráfego, produtos vistos e não
      comprados

---

## 🔵 Qualidade

- [ ] **Testes.** Não há nenhum. Prioridade: `metricas.ts` (função pura, fácil
      de testar) e as ações de `loja.tsx` (baixa de estoque, recebimento de
      ordem).
- [ ] Teste de fluxo (Playwright) do caminho comprar → baixar estoque →
      aparecer no Analytics. Hoje foi verificado à mão.
- [ ] Auditoria de acessibilidade com axe + navegação só por teclado
- [ ] Lighthouse: medir LCP e CLS com fontes reais
- [ ] JSON-LD de `Product` e `Offer` na página do produto (rich snippet com
      preço e disponibilidade no Google)
- [ ] **Card OG por produto** — hoje todos compartilham a mesma arte da marca.
      O ideal é gerar com `opengraph-image.tsx`/`ImageResponse` mostrando foto,
      nome e preço. Depende das fotos reais e de fonte em TTF/WOFF (o satori
      não lê WOFF2, que é o formato que o `next/font` baixa)
- [ ] **CSP** — ficou de fora do `netlify.toml` de propósito: o Next.js injeta
      script inline e uma política no chute quebraria a hidratação. Fazer com
      nonce no middleware, junto com o back-end
- [ ] Domínio próprio na Netlify (hoje sai no subdomínio `*.netlify.app`)
- [ ] Tratar cota estourada do `localStorage` (hoje falha em silêncio)
- [ ] Paginar a lista de pedidos no admin antes que o histórico cresça

---

## Etapa 3 — social (não iniciada)

Do escopo original: templates de promoção do dia, lançamento, prova social e
Reels colaborativo com influenciador, para Instagram e X.
