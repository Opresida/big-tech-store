"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { dataHora, moeda } from "@/lib/formato";
import { BlocoCarregando } from "@/components/CarregandoMarca";
import { useLoja } from "@/lib/loja";

const ROTULO_PAGAMENTO = {
  pix: "Pix",
  credito: "Cartão de crédito",
  boleto: "Boleto bancário",
} as const;

export default function PaginaPedido() {
  const { id } = useParams<{ id: string }>();
  const { deposito, hidratado } = useLoja();

  const pedido = deposito.pedidos.find((p) => p.id === id);

  if (!hidratado) {
    return (
      <BlocoCarregando mensagem="Buscando seu pedido" />
    );
  }

  if (!pedido) {
    return (
      <div className="mx-auto w-full max-w-[1280px] px-4 py-16 lg:px-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-[26px] font-bold text-noite">
            Pedido não encontrado
          </h1>
          <p className="text-[15px] leading-[1.55] text-cinza-600">
            O pedido <span className="font-mono">{id}</span> não está neste
            navegador. Os dados da demo ficam salvos localmente.
          </p>
          <Link href="/produtos" className="btn btn-cta">
            Voltar ao catálogo
          </Link>
        </div>
      </div>
    );
  }

  const previsao = new Date(
    Date.parse(pedido.data) + 5 * 86400000,
  ).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-10 lg:px-8 lg:py-14">
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-verde-claro text-[28px] text-verde-texto">
          ✓
        </span>
        <h1 className="text-[28px] font-bold text-noite sm:text-[34px]">
          Pedido confirmado
        </h1>
        <p className="max-w-md text-[15px] leading-[1.55] text-cinza-600">
          Obrigado, {pedido.cliente.split(" ")[0]}. Enviamos a confirmação e a
          nota fiscal por e-mail. A postagem sai em até 24h úteis.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-cinza-200 p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cinza-200 pb-4">
          <div className="flex flex-col gap-1">
            <span className="t-label text-[10px] text-cinza-500">
              Número do pedido
            </span>
            <span className="font-mono text-[18px] font-bold text-noite">
              {pedido.id}
            </span>
          </div>
          <span className="badge badge-ok">
            <span aria-hidden="true">●</span> Pagamento aprovado
          </span>
        </div>

        <ul className="flex flex-col gap-3">
          {pedido.itens.map((item) => (
            <li key={item.produtoId} className="flex flex-wrap justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[14px] font-semibold leading-[1.35] text-noite">
                  {item.nome}
                </span>
                <span className="font-mono text-[12px] text-cinza-500">
                  SKU {item.sku} · {item.quantidade} ×{" "}
                  {moeda(item.precoUnitario)}
                </span>
              </div>
              <span className="font-mono text-[14px] font-bold tabular-nums text-noite">
                {moeda(item.precoUnitario * item.quantidade)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="flex flex-col gap-2 border-t border-cinza-200 pt-4 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-cinza-600">Forma de pagamento</dt>
            <dd className="font-semibold text-noite">
              {ROTULO_PAGAMENTO[pedido.pagamento]}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-cinza-600">Data</dt>
            <dd className="font-mono text-noite">{dataHora(pedido.data)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-cinza-600">Entrega prevista</dt>
            <dd className="font-semibold text-noite">até {previsao}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between border-t border-cinza-200 pt-3">
            <dt className="text-[15px] font-bold text-noite">Total pago</dt>
            <dd className="text-[24px] font-extrabold text-noite">
              {moeda(pedido.total)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-2xl bg-cinza-50 p-5">
        <p className="text-[13px] leading-[1.55] text-cinza-600">
          <strong className="text-noite">O que acontece agora:</strong> a venda já
          baixou o estoque no painel administrativo e entrou no Financeiro e no
          Analytics. Dá para conferir em{" "}
          <Link href="/admin/vendas" className="font-semibold text-azul underline">
            Vendas
          </Link>{" "}
          e{" "}
          <Link href="/admin/analytics" className="font-semibold text-azul underline">
            Analytics
          </Link>
          .
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/produtos" className="btn btn-cta">
          Continuar comprando
        </Link>
        <Link href="/" className="btn btn-ghost">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
