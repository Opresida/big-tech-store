"use client";

import { useEffect, useState } from "react";
import { BarraEstoque } from "@/components/Estoque";
import { nivelEstoque } from "@/lib/estoque";
import { numero } from "@/lib/formato";
import type { Produto } from "@/lib/tipos";

/**
 * Gatilhos de urgência e escassez.
 *
 * Brandbook 01 — tom de voz: "EVITAMOS urgência falsa ('últimas 2 unidades'
 * sem ser verdade). Queima confiança." Por isso todo número aqui sai do
 * estoque e do histórico de vendas reais do mock, nunca de um valor fixo.
 */

function useContagemRegressiva(alvo: Date) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRestante(Math.max(0, alvo.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [alvo]);

  return restante;
}

/**
 * Data relativa ao "agora" do navegador. Fica nula no servidor porque
 * `Date.now()` durante a renderização quebraria a hidratação.
 */
export function useDataFutura(dias: number) {
  const [data, setData] = useState<string | null>(null);

  // Mesmo motivo do contador: a data só existe no cliente, depois da
  // hidratação. Uma passada só, sem cascata.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(new Date(Date.now() + dias * 86400000).toISOString());
  }, [dias]);

  return data;
}

/** Fim do dia — prazo real da oferta do dia, reinicia à meia-noite. */
export function fimDoDia() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export function ContadorOferta({
  alvo,
  rotulo = "A oferta do dia termina em",
  tema = "claro",
}: {
  alvo: Date;
  rotulo?: string;
  tema?: "claro" | "escuro";
}) {
  const restante = useContagemRegressiva(alvo);

  const horas = restante === null ? 0 : Math.floor(restante / 3600000);
  const minutos = restante === null ? 0 : Math.floor((restante % 3600000) / 60000);
  const segundos = restante === null ? 0 : Math.floor((restante % 60000) / 1000);

  const escuro = tema === "escuro";
  const caixa = escuro
    ? "bg-white/10 text-white"
    : "bg-noite text-white";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={`t-label text-[10px] ${escuro ? "text-white/60" : "text-cinza-500"}`}
      >
        {rotulo}
      </span>
      <div
        className="flex items-center gap-1.5"
        role="timer"
        aria-live="off"
        aria-label={
          restante === null
            ? "Carregando contagem"
            : `Faltam ${horas} horas, ${minutos} minutos e ${segundos} segundos`
        }
      >
        {[
          { v: horas, l: "h" },
          { v: minutos, l: "min" },
          { v: segundos, l: "s" },
        ].map((parte) => (
          <span key={parte.l} className="flex items-center gap-1.5">
            <span
              className={`grid h-11 min-w-11 place-items-center rounded-lg px-2 font-mono text-[18px] font-bold tabular-nums ${caixa}`}
            >
              {restante === null ? "--" : String(parte.v).padStart(2, "0")}
            </span>
            <span
              className={`text-[11px] font-semibold ${escuro ? "text-white/50" : "text-cinza-500"}`}
            >
              {parte.l}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Escassez — só aparece quando o estoque está realmente baixo. */
export function AvisoEscassez({ produto }: { produto: Produto }) {
  const nivel = nivelEstoque(produto);
  if (nivel === "ok") return null;

  if (nivel === "esgotado") {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-cinza-200 bg-cinza-50 p-4">
        <span className="text-[14px] font-bold text-cinza-600">
          Produto esgotado
        </span>
        <span className="text-[13px] leading-[1.5] text-cinza-500">
          Já está em reposição com o fornecedor. Enquanto isso, veja as opções
          parecidas abaixo.
        </span>
      </div>
    );
  }

  const critico = nivel === "critico";

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-xl border p-4 ${
        critico
          ? "border-vermelho-borda bg-vermelho-claro"
          : "border-ambar-borda bg-ambar-claro"
      }`}
    >
      <span
        className={`text-[14px] font-bold ${critico ? "text-vermelho-texto" : "text-ambar"}`}
      >
        {critico
          ? `Últimas ${produto.estoque} unidades no nosso estoque`
          : `Restam ${produto.estoque} unidades desta oferta`}
      </span>
      <BarraEstoque produto={produto} mostrarTexto={false} />
      <span className="text-[12px] leading-[1.5] text-cinza-600">
        Quantidade real do nosso depósito, atualizada a cada venda. Sem número
        inventado.
      </span>
    </div>
  );
}

/** Prova social — números derivados do histórico de pedidos do mock. */
export function ProvaSocial({
  vendidos30,
  avaliacoes,
  compacto = false,
}: {
  vendidos30: number;
  avaliacoes: number;
  compacto?: boolean;
}) {
  const itens = [
    {
      valor: numero(vendidos30),
      rotulo: vendidos30 === 1 ? "unidade vendida em 30 dias" : "unidades vendidas em 30 dias",
    },
    { valor: numero(avaliacoes), rotulo: "avaliações de compradores" },
    { valor: "24h", rotulo: "para postar seu pedido" },
  ];

  if (compacto) {
    return (
      <p className="text-[13px] leading-[1.5] text-cinza-600">
        <strong className="font-bold text-noite">{numero(vendidos30)}</strong>{" "}
        vendidos nos últimos 30 dias ·{" "}
        <strong className="font-bold text-noite">{numero(avaliacoes)}</strong>{" "}
        avaliações
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-3 gap-3">
      {itens.map((i) => (
        <div
          key={i.rotulo}
          className="flex flex-col gap-1 rounded-xl bg-cinza-50 p-3.5"
        >
          <dt className="sr-only">{i.rotulo}</dt>
          <dd className="text-[22px] font-extrabold leading-none text-noite">
            {i.valor}
          </dd>
          <span className="text-[11px] leading-[1.35] text-cinza-500">
            {i.rotulo}
          </span>
        </div>
      ))}
    </dl>
  );
}

/** Selos de segurança da compra — Brandbook 01, bloco "PROVA". */
export function SelosConfianca({ className = "" }: { className?: string }) {
  const selos = [
    { titulo: "Nota fiscal", texto: "Em todo pedido" },
    { titulo: "Garantia", texto: "12 meses de fábrica" },
    { titulo: "Site seguro", texto: "Pagamento criptografado" },
    { titulo: "Troca em 7 dias", texto: "Arrependimento garantido" },
  ];
  return (
    <ul className={`grid grid-cols-2 gap-2.5 sm:grid-cols-4 ${className}`}>
      {selos.map((s) => (
        <li
          key={s.titulo}
          className="flex flex-col gap-1 rounded-lg border border-cinza-200 p-3"
        >
          <span className="text-[13px] font-bold text-noite">{s.titulo}</span>
          <span className="text-[11px] leading-[1.35] text-cinza-500">
            {s.texto}
          </span>
        </li>
      ))}
    </ul>
  );
}
