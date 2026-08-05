"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DESCONTO_PIX, moeda, parcela, PARCELAS_MAX, precoPix } from "@/lib/formato";
import { useLoja } from "@/lib/loja";
import type { FormaPagamento, ItemCarrinho } from "@/lib/tipos";

type Campos = {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  cidade: string;
  uf: string;
};

const VAZIO: Campos = {
  nome: "",
  email: "",
  cpf: "",
  telefone: "",
  cep: "",
  endereco: "",
  numero: "",
  complemento: "",
  cidade: "",
  uf: "",
};

const so = (v: string) => v.replace(/\D/g, "");

function validar(c: Campos) {
  const erros: Partial<Record<keyof Campos, string>> = {};
  if (c.nome.trim().split(/\s+/).length < 2) erros.nome = "Informe nome e sobrenome";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) erros.email = "E-mail inválido";
  if (so(c.cpf).length !== 11) erros.cpf = "CPF incompleto";
  if (so(c.telefone).length < 10) erros.telefone = "Telefone incompleto";
  if (so(c.cep).length !== 8) erros.cep = "CEP incompleto";
  if (!c.endereco.trim()) erros.endereco = "Informe o endereço";
  if (!c.numero.trim()) erros.numero = "Informe o número";
  if (!c.cidade.trim()) erros.cidade = "Informe a cidade";
  if (c.uf.trim().length !== 2) erros.uf = "UF com 2 letras";
  return erros;
}

const PAGAMENTOS: {
  id: FormaPagamento;
  titulo: string;
  detalhe: (total: number) => string;
  destaque?: string;
}[] = [
  {
    id: "pix",
    titulo: "Pix",
    detalhe: (t) => `${moeda(precoPix(t))} à vista`,
    destaque: `${Math.round(DESCONTO_PIX * 100)}% de desconto`,
  },
  {
    id: "credito",
    titulo: "Cartão de crédito",
    detalhe: (t) => `até ${PARCELAS_MAX}x de ${moeda(parcela(t))} sem juros`,
  },
  {
    id: "boleto",
    titulo: "Boleto bancário",
    detalhe: (t) => `${moeda(t)} — compensa em até 3 dias úteis`,
  },
];

export function FormularioCheckout({
  itens,
  total,
  canal = "site",
  aoConcluir,
}: {
  itens: ItemCarrinho[];
  total: number;
  canal?: "site" | "checkout-direto";
  aoConcluir?: () => void;
}) {
  const { finalizarPedido } = useLoja();
  const router = useRouter();
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Campos, string>>>({});
  const [pagamento, setPagamento] = useState<FormaPagamento>("pix");
  const [enviando, setEnviando] = useState(false);

  function mudar(chave: keyof Campos, valor: string) {
    setCampos((c) => ({ ...c, [chave]: valor }));
    if (erros[chave]) setErros((e) => ({ ...e, [chave]: undefined }));
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novos = validar(campos);
    setErros(novos);
    if (Object.keys(novos).length) {
      document
        .querySelector<HTMLElement>("[data-erro='1']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!itens.length) return;

    setEnviando(true);
    const pedido = finalizarPedido({
      cliente: campos.nome.trim(),
      pagamento,
      itens,
      canal,
    });
    aoConcluir?.();
    router.push(`/pedido/${pedido.id}`);
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
      <Secao numero="01" titulo="Seus dados">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            id="nome"
            rotulo="Nome completo"
            valor={campos.nome}
            erro={erros.nome}
            aoMudar={(v) => mudar("nome", v)}
            placeholder="Maria da Silva"
            autoComplete="name"
            className="sm:col-span-2"
          />
          <Campo
            id="email"
            rotulo="E-mail"
            tipo="email"
            valor={campos.email}
            erro={erros.email}
            aoMudar={(v) => mudar("email", v)}
            placeholder="voce@email.com"
            autoComplete="email"
          />
          <Campo
            id="telefone"
            rotulo="Celular com DDD"
            tipo="tel"
            valor={campos.telefone}
            erro={erros.telefone}
            aoMudar={(v) => mudar("telefone", v)}
            placeholder="(11) 90000-0000"
            autoComplete="tel"
          />
          <Campo
            id="cpf"
            rotulo="CPF"
            valor={campos.cpf}
            erro={erros.cpf}
            aoMudar={(v) => mudar("cpf", v)}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
        </div>
      </Secao>

      <Secao numero="02" titulo="Entrega">
        <div className="grid gap-4 sm:grid-cols-6">
          <Campo
            id="cep"
            rotulo="CEP"
            valor={campos.cep}
            erro={erros.cep}
            aoMudar={(v) => mudar("cep", v)}
            placeholder="00000-000"
            inputMode="numeric"
            autoComplete="postal-code"
            className="sm:col-span-2"
          />
          <Campo
            id="endereco"
            rotulo="Endereço"
            valor={campos.endereco}
            erro={erros.endereco}
            aoMudar={(v) => mudar("endereco", v)}
            placeholder="Rua, avenida..."
            autoComplete="address-line1"
            className="sm:col-span-4"
          />
          <Campo
            id="numero"
            rotulo="Número"
            valor={campos.numero}
            erro={erros.numero}
            aoMudar={(v) => mudar("numero", v)}
            placeholder="123"
            className="sm:col-span-2"
          />
          <Campo
            id="complemento"
            rotulo="Complemento (opcional)"
            valor={campos.complemento}
            aoMudar={(v) => mudar("complemento", v)}
            placeholder="Apto 42"
            className="sm:col-span-4"
          />
          <Campo
            id="cidade"
            rotulo="Cidade"
            valor={campos.cidade}
            erro={erros.cidade}
            aoMudar={(v) => mudar("cidade", v)}
            placeholder="São Paulo"
            autoComplete="address-level2"
            className="sm:col-span-4"
          />
          <Campo
            id="uf"
            rotulo="UF"
            valor={campos.uf}
            erro={erros.uf}
            aoMudar={(v) => mudar("uf", v.toUpperCase().slice(0, 2))}
            placeholder="SP"
            className="sm:col-span-2"
          />
        </div>
      </Secao>

      <Secao numero="03" titulo="Pagamento">
        <fieldset className="flex flex-col gap-3 border-0 p-0">
          <legend className="sr-only">Forma de pagamento</legend>
          {PAGAMENTOS.map((p) => {
            const ativo = pagamento === p.id;
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                  ativo
                    ? "border-azul bg-azul-claro"
                    : "border-cinza-200 hover:border-cinza-300"
                }`}
              >
                <input
                  type="radio"
                  name="pagamento"
                  value={p.id}
                  checked={ativo}
                  onChange={() => setPagamento(p.id)}
                  className="h-4 w-4 shrink-0 accent-[#0B37D6]"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold text-noite">
                      {p.titulo}
                    </span>
                    {p.destaque && (
                      <span className="badge badge-ok !px-2 !py-1 !text-[11px]">
                        {p.destaque}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[13px] text-cinza-600">
                    {p.detalhe(total)}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      </Secao>

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          className="btn btn-cta w-full text-[16px]"
          disabled={enviando || !itens.length}
        >
          {enviando ? "Processando…" : `Finalizar compra · ${moeda(pagamento === "pix" ? precoPix(total) : total)}`}
        </button>
        <p className="text-center text-[12px] leading-[1.5] text-cinza-500">
          Ambiente seguro. Ao finalizar você concorda com os termos de compra.
          Nota fiscal enviada por e-mail.
        </p>
      </div>
    </form>
  );
}

function Secao({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-cinza-200 p-5">
      <div className="flex items-baseline gap-3">
        <span className="t-label text-[10px] text-azul">{numero}</span>
        <h2 className="text-[17px] font-bold text-noite">{titulo}</h2>
      </div>
      {children}
    </section>
  );
}

function Campo({
  id,
  rotulo,
  valor,
  erro,
  aoMudar,
  tipo = "text",
  placeholder,
  className = "",
  inputMode,
  autoComplete,
}: {
  id: string;
  rotulo: string;
  valor: string;
  erro?: string;
  aoMudar: (v: string) => void;
  tipo?: string;
  placeholder?: string;
  className?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
  autoComplete?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`} data-erro={erro ? "1" : undefined}>
      <label htmlFor={id} className={`rotulo ${erro ? "!text-vermelho-texto" : ""}`}>
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        aria-invalid={!!erro}
        aria-describedby={erro ? `${id}-erro` : undefined}
        className={`campo ${erro ? "campo-erro" : ""}`}
      />
      {erro && (
        <span id={`${id}-erro`} className="text-[12px] text-vermelho-texto">
          {erro}
        </span>
      )}
    </div>
  );
}
