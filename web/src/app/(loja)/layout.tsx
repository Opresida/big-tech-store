import { SplashEntrada } from "@/components/CarregandoMarca";
import { Cabecalho } from "@/components/loja/Cabecalho";
import { Rodape } from "@/components/loja/Rodape";

export default function LayoutLoja({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Tela de marca de 4s na entrada, uma vez por sessão */}
      <SplashEntrada />
      <Cabecalho />
      <main className="flex-1">{children}</main>
      <Rodape />
    </div>
  );
}
