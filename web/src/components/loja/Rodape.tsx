import Link from "next/link";
import { Logo } from "@/components/Marca";
import { CATEGORIAS } from "@/lib/catalogo";

const INSTITUCIONAL = [
  { href: "/produtos", rotulo: "Catálogo completo" },
  { href: "/produtos?ofertas=1", rotulo: "Ofertas do dia" },
  { href: "/carrinho", rotulo: "Meu carrinho" },
  { href: "/admin/login", rotulo: "Área administrativa" },
];

const GARANTIAS = [
  { titulo: "Nota fiscal em tudo", texto: "Produto legal, garantia de fábrica." },
  { titulo: "Rastreio do pedido", texto: "Código de envio em até 24h úteis." },
  { titulo: "Pix com 5% off", texto: "Aprovação na hora, envio no mesmo dia." },
  { titulo: "Troca em 7 dias", texto: "Direito de arrependimento garantido." },
];

export function Rodape() {
  return (
    <footer className="mt-16 bg-noite text-white">
      <div className="mx-auto max-w-[1280px] px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-6 border-b border-white/10 pb-10 lg:grid-cols-4">
          {GARANTIAS.map((g) => (
            <div key={g.titulo} className="flex flex-col gap-1.5">
              <span className="t-label text-[10px] text-amarelo">{g.titulo}</span>
              <span className="text-[14px] leading-[1.5] text-white/70">
                {g.texto}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-10 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Logo tamanho={44} variante="branco" corTexto="#fff" />
            <p className="max-w-xs text-[14px] leading-[1.55] text-white/60">
              Tecnologia de verdade, no preço que cabe. 100% online, entrega para
              todo o Brasil.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <span className="t-label text-[10px] text-white/50">Categorias</span>
            {CATEGORIAS.map((c) => (
              <Link
                key={c.id}
                href={`/produtos?categoria=${c.id}`}
                className="text-[14px] text-white/70 transition hover:text-laranja"
              >
                {c.nome}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <span className="t-label text-[10px] text-white/50">Loja</span>
            {INSTITUCIONAL.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[14px] text-white/70 transition hover:text-laranja"
              >
                {l.rotulo}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <span className="t-label text-[10px] text-white/50">Atendimento</span>
            <span className="font-mono text-[14px] text-white/70">
              seg a sex, 9h–18h
            </span>
            <span className="font-mono text-[14px] text-white/70">
              (11) 4000-0000
            </span>
            <span className="font-mono text-[14px] text-white/70">
              ajuda@bigtechstore.com.br
            </span>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-[12px] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono">
            BIG TECH STORE · CNPJ 00.000.000/0001-00 · dados de demonstração
          </span>
          <span className="font-mono">© 2026 — todos os direitos reservados</span>
        </div>
      </div>
      <div className="flex h-2">
        <div className="flex-1 bg-azul" />
        <div className="flex-1 bg-laranja" />
        <div className="flex-1 bg-amarelo" />
      </div>
    </footer>
  );
}
