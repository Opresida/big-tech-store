"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { estadoInicial } from "./semente";
import type {
  Deposit,
  FormaPagamento,
  ItemCarrinho,
  ItemPedido,
  OrdemCompra,
  Pedido,
  Produto,
} from "./tipos";

const CHAVE = "bts.loja.v1";
const CHAVE_SESSAO = "bts.admin.v1";

/** Credencial da demo — o back-end substitui isso na próxima etapa. */
export const CREDENCIAL_DEMO = {
  email: "admin@bigtechstore.com.br",
  senha: "bigtech123",
};

type Persistido = {
  deposito: Deposit;
  carrinho: ItemCarrinho[];
};

type Contexto = {
  hidratado: boolean;
  deposito: Deposit;
  produtos: Produto[];
  carrinho: ItemCarrinho[];
  adminLogado: boolean;
  // catálogo
  produtoPorSlug: (slug: string) => Produto | undefined;
  produtoPorId: (id: string) => Produto | undefined;
  // carrinho
  adicionarAoCarrinho: (produtoId: string, quantidade?: number) => void;
  definirQuantidade: (produtoId: string, quantidade: number) => void;
  removerDoCarrinho: (produtoId: string) => void;
  limparCarrinho: () => void;
  itensNoCarrinho: number;
  // pedidos
  finalizarPedido: (dados: {
    cliente: string;
    pagamento: FormaPagamento;
    itens: ItemCarrinho[];
    canal?: Pedido["canal"];
  }) => Pedido;
  // estoque / compras
  ajustarEstoque: (produtoId: string, delta: number) => void;
  definirEstoque: (produtoId: string, valor: number) => void;
  atualizarProduto: (produtoId: string, dados: Partial<Produto>) => void;
  criarCompra: (dados: {
    fornecedor: string;
    previsao: string;
    itens: { produtoId: string; quantidade: number }[];
  }) => OrdemCompra;
  enviarCompra: (id: string) => void;
  receberCompra: (id: string) => void;
  // sessão
  entrar: (email: string, senha: string) => boolean;
  sair: () => void;
  // utilidades
  reiniciarDados: () => void;
};

const LojaContext = createContext<Contexto | null>(null);

export function LojaProvider({ children }: { children: React.ReactNode }) {
  const [deposito, setDeposito] = useState<Deposit>(() => estadoInicial());
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [adminLogado, setAdminLogado] = useState(false);
  const [hidratado, setHidratado] = useState(false);
  const podeSalvar = useRef(false);

  // Carrega o "banco" mockado do localStorage depois da hidratação.
  //
  // O setState aqui é intencional e roda uma única vez: o servidor renderiza a
  // semente determinística e o cliente só troca pelo estado salvo DEPOIS da
  // hidratação — ler o localStorage durante a renderização causaria divergência
  // de hidratação. Não há cascata: o efeito não tem dependências.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE);
      if (bruto) {
        const dados = JSON.parse(bruto) as Persistido;
        if (dados?.deposito?.produtos?.length) setDeposito(dados.deposito);
        if (Array.isArray(dados?.carrinho)) setCarrinho(dados.carrinho);
      }
      setAdminLogado(window.sessionStorage.getItem(CHAVE_SESSAO) === "1");
    } catch {
      // storage indisponível — segue com a semente
    }
    podeSalvar.current = true;
    setHidratado(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!podeSalvar.current) return;
    try {
      window.localStorage.setItem(
        CHAVE,
        JSON.stringify({ deposito, carrinho } satisfies Persistido),
      );
    } catch {
      // cota estourada ou modo privado — a demo continua em memória
    }
  }, [deposito, carrinho]);

  const produtoPorSlug = useCallback(
    (slug: string) => deposito.produtos.find((p) => p.slug === slug),
    [deposito.produtos],
  );
  const produtoPorId = useCallback(
    (id: string) => deposito.produtos.find((p) => p.id === id),
    [deposito.produtos],
  );

  const adicionarAoCarrinho = useCallback(
    (produtoId: string, quantidade = 1) => {
      setCarrinho((atual) => {
        const existente = atual.find((i) => i.produtoId === produtoId);
        if (existente) {
          return atual.map((i) =>
            i.produtoId === produtoId
              ? { ...i, quantidade: i.quantidade + quantidade }
              : i,
          );
        }
        return [...atual, { produtoId, quantidade }];
      });
    },
    [],
  );

  const definirQuantidade = useCallback((produtoId: string, quantidade: number) => {
    setCarrinho((atual) =>
      quantidade <= 0
        ? atual.filter((i) => i.produtoId !== produtoId)
        : atual.map((i) => (i.produtoId === produtoId ? { ...i, quantidade } : i)),
    );
  }, []);

  const removerDoCarrinho = useCallback((produtoId: string) => {
    setCarrinho((atual) => atual.filter((i) => i.produtoId !== produtoId));
  }, []);

  const limparCarrinho = useCallback(() => setCarrinho([]), []);

  const finalizarPedido = useCallback<Contexto["finalizarPedido"]>(
    ({ cliente, pagamento, itens, canal = "site" }) => {
      const produtos = deposito.produtos;
      const itensPedido: ItemPedido[] = itens
        .map((item) => {
          const p = produtos.find((x) => x.id === item.produtoId);
          if (!p) return null;
          return {
            produtoId: p.id,
            nome: p.nome,
            sku: p.sku,
            quantidade: Math.min(item.quantidade, Math.max(p.estoque, 0)),
            precoUnitario: p.preco,
            custoUnitario: p.custo,
          };
        })
        .filter((i): i is ItemPedido => !!i && i.quantidade > 0);

      const bruto = itensPedido.reduce(
        (s, i) => s + i.precoUnitario * i.quantidade,
        0,
      );
      const total = pagamento === "pix" ? Math.round(bruto * 0.95 * 100) / 100 : bruto;

      const pedido: Pedido = {
        id: `BTS-${Math.floor(Date.now() / 1000) % 100000}`,
        data: new Date().toISOString(),
        cliente,
        itens: itensPedido,
        total,
        custoTotal: itensPedido.reduce(
          (s, i) => s + i.custoUnitario * i.quantidade,
          0,
        ),
        pagamento,
        status: "aprovado",
        canal,
      };

      // A venda baixa o estoque — é o que o Setor de Vendas enxerga acabando.
      setDeposito((d) => ({
        ...d,
        pedidos: [pedido, ...d.pedidos],
        produtos: d.produtos.map((p) => {
          const item = itensPedido.find((i) => i.produtoId === p.id);
          return item
            ? { ...p, estoque: Math.max(0, p.estoque - item.quantidade) }
            : p;
        }),
      }));

      return pedido;
    },
    [deposito.produtos],
  );

  const ajustarEstoque = useCallback((produtoId: string, delta: number) => {
    setDeposito((d) => ({
      ...d,
      produtos: d.produtos.map((p) =>
        p.id === produtoId ? { ...p, estoque: Math.max(0, p.estoque + delta) } : p,
      ),
    }));
  }, []);

  const definirEstoque = useCallback((produtoId: string, valor: number) => {
    setDeposito((d) => ({
      ...d,
      produtos: d.produtos.map((p) =>
        p.id === produtoId ? { ...p, estoque: Math.max(0, Math.round(valor)) } : p,
      ),
    }));
  }, []);

  const atualizarProduto = useCallback(
    (produtoId: string, dados: Partial<Produto>) => {
      setDeposito((d) => ({
        ...d,
        produtos: d.produtos.map((p) =>
          p.id === produtoId ? { ...p, ...dados } : p,
        ),
      }));
    },
    [],
  );

  const criarCompra = useCallback<Contexto["criarCompra"]>(
    ({ fornecedor, previsao, itens }) => {
      const completos = itens.map((it) => {
        const p = deposito.produtos.find((x) => x.id === it.produtoId);
        return { ...it, custoUnitario: p?.custo ?? 0 };
      });
      const ordem: OrdemCompra = {
        id: `OC-${2046 + deposito.compras.length}`,
        data: new Date().toISOString(),
        fornecedor,
        previsao,
        status: "rascunho",
        itens: completos,
        total: completos.reduce((s, it) => s + it.custoUnitario * it.quantidade, 0),
      };
      setDeposito((d) => ({ ...d, compras: [ordem, ...d.compras] }));
      return ordem;
    },
    [deposito.produtos, deposito.compras.length],
  );

  const enviarCompra = useCallback((id: string) => {
    setDeposito((d) => ({
      ...d,
      compras: d.compras.map((c) =>
        c.id === id && c.status === "rascunho" ? { ...c, status: "enviada" } : c,
      ),
    }));
  }, []);

  /** Receber a ordem é o que dá entrada no estoque. */
  const receberCompra = useCallback((id: string) => {
    setDeposito((d) => {
      const ordem = d.compras.find((c) => c.id === id);
      if (!ordem || ordem.status === "recebida") return d;
      return {
        ...d,
        compras: d.compras.map((c) =>
          c.id === id
            ? { ...c, status: "recebida", recebidaEm: new Date().toISOString() }
            : c,
        ),
        produtos: d.produtos.map((p) => {
          const item = ordem.itens.find((i) => i.produtoId === p.id);
          return item ? { ...p, estoque: p.estoque + item.quantidade } : p;
        }),
      };
    });
  }, []);

  const entrar = useCallback((email: string, senha: string) => {
    const ok =
      email.trim().toLowerCase() === CREDENCIAL_DEMO.email &&
      senha === CREDENCIAL_DEMO.senha;
    if (ok) {
      setAdminLogado(true);
      try {
        window.sessionStorage.setItem(CHAVE_SESSAO, "1");
      } catch {}
    }
    return ok;
  }, []);

  const sair = useCallback(() => {
    setAdminLogado(false);
    try {
      window.sessionStorage.removeItem(CHAVE_SESSAO);
    } catch {}
  }, []);

  const reiniciarDados = useCallback(() => {
    setDeposito(estadoInicial());
    setCarrinho([]);
  }, []);

  const itensNoCarrinho = useMemo(
    () => carrinho.reduce((s, i) => s + i.quantidade, 0),
    [carrinho],
  );

  const valor = useMemo<Contexto>(
    () => ({
      hidratado,
      deposito,
      produtos: deposito.produtos,
      carrinho,
      adminLogado,
      produtoPorSlug,
      produtoPorId,
      adicionarAoCarrinho,
      definirQuantidade,
      removerDoCarrinho,
      limparCarrinho,
      itensNoCarrinho,
      finalizarPedido,
      ajustarEstoque,
      definirEstoque,
      atualizarProduto,
      criarCompra,
      enviarCompra,
      receberCompra,
      entrar,
      sair,
      reiniciarDados,
    }),
    [
      hidratado,
      deposito,
      carrinho,
      adminLogado,
      produtoPorSlug,
      produtoPorId,
      adicionarAoCarrinho,
      definirQuantidade,
      removerDoCarrinho,
      limparCarrinho,
      itensNoCarrinho,
      finalizarPedido,
      ajustarEstoque,
      definirEstoque,
      atualizarProduto,
      criarCompra,
      enviarCompra,
      receberCompra,
      entrar,
      sair,
      reiniciarDados,
    ],
  );

  return <LojaContext.Provider value={valor}>{children}</LojaContext.Provider>;
}

export function useLoja() {
  const ctx = useContext(LojaContext);
  if (!ctx) throw new Error("useLoja precisa estar dentro de <LojaProvider>");
  return ctx;
}
