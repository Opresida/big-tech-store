"use client";

import { useEffect, useState } from "react";
import { Simbolo } from "./Marca";

/**
 * Duração do loader: 3 segundos.
 *
 * É mínimo E teto ao mesmo tempo — a tela de marca fica exatamente 3s.
 * O mínimo existe porque a hidratação termina em ~150ms: sem ele o spinner
 * piscava e sumia antes de o olho registrar, parecendo que não tinha entrado.
 * O teto existe para a tela nunca ficar girando para sempre se algo travar.
 */
const TETO_MS = 3000;
const MINIMO_MS = 3000;

/**
 * Retorna `true` enquanto vale mostrar o loader: enquanto estiver carregando
 * OU o tempo mínimo não tiver passado — e sempre respeitando o teto.
 */
export function useLoaderComTeto(
  carregando: boolean,
  { minimoMs = MINIMO_MS, tetoMs = TETO_MS }: { minimoMs?: number; tetoMs?: number } = {},
) {
  const [cumpriuMinimo, setCumpriuMinimo] = useState(minimoMs <= 0);
  const [estourou, setEstourou] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setCumpriuMinimo(true), minimoMs);
    const t2 = setTimeout(() => setEstourou(true), tetoMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [minimoMs, tetoMs]);

  if (estourou) return false;
  return carregando || !cumpriuMinimo;
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

const CHAVE_SPLASH = "bts.splash.v1";

/**
 * Tela de marca ao entrar no site: 4 segundos, uma vez por sessão do
 * navegador.
 *
 * Começa visível já na renderização do servidor — de propósito. Se só
 * aparecesse depois de montar, o visitante veria a home por um instante e
 * *depois* a splash cairia por cima, que é pior do que não ter splash.
 * Navegar entre páginas não repete: a marcação fica no sessionStorage.
 */
export function SplashEntrada() {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    let javiu = false;
    try {
      javiu = window.sessionStorage.getItem(CHAVE_SPLASH) === "1";
      window.sessionStorage.setItem(CHAVE_SPLASH, "1");
    } catch {
      // modo privado: mostra a splash, sem memória entre navegações
    }

    if (javiu) {
      // Leitura de fonte externa (sessionStorage) na hidratação: mesma exceção
      // documentada em lib/loja.tsx. Roda uma vez, sem cascata.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisivel(false);
      return;
    }

    const id = setTimeout(() => setVisivel(false), TETO_MS);
    return () => clearTimeout(id);
  }, []);

  if (!visivel) return null;
  return <TelaCarregando mensagem="O melhor preço do Brasil" />;
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
