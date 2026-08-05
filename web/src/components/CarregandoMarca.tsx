"use client";

import { useEffect, useState } from "react";
import { Simbolo } from "./Marca";

/**
 * Teto de exibição do loader. O carregamento real leva poucos centenas de
 * milissegundos; estes 4 segundos são a válvula de segurança para que a tela
 * nunca fique girando para sempre se algo travar.
 */
const TETO_MS = 4000;

/**
 * Retorna `true` enquanto vale mostrar o loader: enquanto estiver carregando
 * E o teto de 4s não tiver estourado.
 */
export function useLoaderComTeto(carregando: boolean, tetoMs = TETO_MS) {
  const [estourou, setEstourou] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setEstourou(true), tetoMs);
    return () => clearTimeout(id);
  }, [tetoMs]);

  return carregando && !estourou;
}

/** Anel girando em torno do símbolo da marca. */
export function SpinnerMarca({ tamanho = 84 }: { tamanho?: number }) {
  const traco = Math.max(3, Math.round(tamanho * 0.045));
  const raio = tamanho / 2 - traco / 2;
  const perimetro = 2 * Math.PI * raio;

  return (
    <span
      className="relative grid place-items-center"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg
        className="girando absolute inset-0"
        width={tamanho}
        height={tamanho}
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        aria-hidden="true"
      >
        {/* trilho */}
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="rgba(255,255,255,.16)"
          strokeWidth={traco}
        />
        {/* arco em laranja — a cor de ação da marca */}
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="#FF6A00"
          strokeWidth={traco}
          strokeLinecap="round"
          strokeDasharray={`${perimetro * 0.28} ${perimetro}`}
        />
      </svg>
      <span className="pulsando">
        <Simbolo tamanho={Math.round(tamanho * 0.56)} />
      </span>
    </span>
  );
}

/**
 * Tela cheia de carregamento com a marca. Some sozinha quando o conteúdo
 * fica pronto ou, no máximo, em 4 segundos.
 */
export function TelaCarregando({
  mensagem = "Carregando…",
  tema = "escuro",
}: {
  mensagem?: string;
  tema?: "escuro" | "claro";
}) {
  const escuro = tema === "escuro";

  return (
    <div
      className={`surgindo fixed inset-0 z-[100] grid place-items-center ${
        escuro ? "bg-noite" : "bg-white"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <SpinnerMarca />

        <div className="flex flex-col items-center gap-2">
          <span
            className="t-display text-[22px]"
            style={{ color: escuro ? "#fff" : "#08133A" }}
          >
            Big Tech Store
          </span>
          <span
            className={`t-label text-[10px] ${escuro ? "text-amarelo" : "text-azul"}`}
          >
            {mensagem}
          </span>
        </div>
      </div>

      {/* Faixa tricolor da marca */}
      <div className="absolute bottom-0 left-0 right-0 flex h-1.5">
        <div className="flex-1 bg-azul" />
        <div className="flex-1 bg-laranja" />
        <div className="flex-1 bg-amarelo" />
      </div>
    </div>
  );
}

/** Versão embutida, para quando só um bloco da página está carregando. */
export function BlocoCarregando({
  mensagem = "Carregando…",
}: {
  mensagem?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center"
      role="status"
      aria-live="polite"
    >
      <SpinnerMarca tamanho={64} />
      <span className="text-[14px] text-cinza-500">{mensagem}</span>
    </div>
  );
}
