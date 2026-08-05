"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Navegacao } from "@/components/admin/Navegacao";
import { useLoja } from "@/lib/loja";

export default function LayoutPainel({
  children,
}: {
  children: React.ReactNode;
}) {
  const { adminLogado, hidratado } = useLoja();
  const router = useRouter();

  useEffect(() => {
    if (hidratado && !adminLogado) router.replace("/admin/login");
  }, [hidratado, adminLogado, router]);

  if (!hidratado || !adminLogado) {
    return (
      <div className="grid min-h-screen place-items-center bg-cinza-50">
        <p className="text-[14px] text-cinza-500">
          {hidratado ? "Redirecionando para o login…" : "Carregando painel…"}
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
