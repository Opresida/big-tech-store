"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navegacao } from "@/components/admin/Navegacao";
import { TelaCarregando, useLoaderComTeto } from "@/components/CarregandoMarca";
import { useLoja } from "@/lib/loja";

export default function LayoutPainel({
  children,
}: {
  children: React.ReactNode;
}) {
  const { adminLogado, hidratado } = useLoja();
  const router = useRouter();

  const aguardando = !hidratado || !adminLogado;
  // O loader some sozinho em no máximo 4s, mesmo que algo trave.
  const mostrarLoader = useLoaderComTeto(aguardando);

  useEffect(() => {
    if (hidratado && !adminLogado) router.replace("/admin/login");
  }, [hidratado, adminLogado, router]);

  if (aguardando) {
    if (mostrarLoader) {
      return (
        <TelaCarregando
          mensagem={hidratado ? "Redirecionando para o login" : "Abrindo o painel"}
        />
      );
    }
    // Passou o teto: mensagem estática, sem nada girando na tela.
    return (
      <div className="grid min-h-screen place-items-center bg-cinza-50 px-6">
        <p className="text-center text-[14px] text-cinza-500">
          {hidratado
            ? "Sessão não encontrada. Redirecionando para o login…"
            : "Não foi possível carregar o painel. Recarregue a página."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-cinza-50 lg:flex-row">
      <Navegacao />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
