export type CategoriaId =
  | "consoles"
  | "celulares"
  | "notebooks"
  | "audio"
  | "acessorios";

export type Forma = "console" | "celular" | "notebook" | "audio" | "controle";

export type Selo = "lancamento" | "frete-gratis" | "mais-vendido";

export type Produto = {
  id: string;
  slug: string;
  sku: string;
  nome: string;
  marca: string;
  categoria: CategoriaId;
  forma: Forma;
  /** Preço cheio, riscado no bloco de preço. */
  precoDe: number;
  /** Preço à vista praticado. */
  preco: number;
  /** Custo de aquisição — base da margem no Financeiro. */
  custo: number;
  estoque: number;
  /** Estoque-alvo: base da barra de estoque (verde >40%, âmbar 15–40%, vermelho <15%). */
  estoqueAlvo: number;
  nota: number;
  avaliacoes: number;
  selos: Selo[];
  resumo: string;
  destaques: string[];
  ficha: { rotulo: string; valor: string }[];
  fornecedor: string;
};

export type Categoria = {
  id: CategoriaId;
  nome: string;
  descricao: string;
};

export type ItemCarrinho = {
  produtoId: string;
  quantidade: number;
};

export type ItemPedido = {
  produtoId: string;
  nome: string;
  sku: string;
  quantidade: number;
  precoUnitario: number;
  custoUnitario: number;
};

export type FormaPagamento = "pix" | "credito" | "boleto";

export type Pedido = {
  id: string;
  data: string;
  cliente: string;
  itens: ItemPedido[];
  total: number;
  custoTotal: number;
  pagamento: FormaPagamento;
  status: "aprovado" | "processando" | "cancelado";
  canal: "site" | "checkout-direto";
};

export type StatusCompra = "rascunho" | "enviada" | "recebida";

export type ItemCompra = {
  produtoId: string;
  quantidade: number;
  custoUnitario: number;
};

export type OrdemCompra = {
  id: string;
  data: string;
  fornecedor: string;
  itens: ItemCompra[];
  total: number;
  status: StatusCompra;
  previsao: string;
  recebidaEm?: string;
};

export type Deposit = {
  produtos: Produto[];
  pedidos: Pedido[];
  compras: OrdemCompra[];
};
