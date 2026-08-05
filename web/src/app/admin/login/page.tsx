"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Marca";
import { CREDENCIAL_DEMO, useLoja } from "@/lib/loja";

export default function PaginaLogin() {
  const { entrar, adminLogado, hidratado } = useLoja();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (hidratado && adminLogado) router.replace("/admin");
  }, [hidratado, adminLogado, router]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (entrar(email, senha)) {
      router.push("/admin");
    } else {
      setErro("E-mail ou senha incorretos. Confira os dados da demonstração.");
    }
  }

  function preencherDemo() {
    setEmail(CREDENCIAL_DEMO.email);
    setSenha(CREDENCIAL_DEMO.senha);
    setErro("");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
      {/* Lado da marca */}
      <div className="relative hidden overflow-hidden bg-noite p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 420px at 88% 8%, rgba(255,106,0,.28), transparent 60%)",
          }}
          aria-hidden="true"
        />
        <div className="relative">
          <Logo tamanho={52} variante="branco" corTexto="#fff" />
        </div>

        <div className="relative flex flex-col gap-6">
          <span className="t-label text-[10px] text-amarelo">
            Painel administrativo
          </span>
          <h1 className="t-display text-[48px]">
            Estoque, compras,
            <br />
            vendas e caixa
            <br />
            <span className="text-amarelo">num lugar só</span>
          </h1>
          <p className="max-w-md text-[16px] leading-[1.55] text-white/60">
            Controle de estoque com alerta de ruptura, entrada por ordem de
            compra, ranking de mais vendidos e resultado financeiro do mês.
          </p>
        </div>

        <div className="relative flex h-2 w-40">
          <div className="flex-1 bg-azul" />
          <div className="flex-1 bg-laranja" />
          <div className="flex-1 bg-amarelo" />
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo tamanho={44} />
          </div>

          <div className="mb-7 flex flex-col gap-2">
            <h2 className="text-[26px] font-bold text-noite">Entrar no painel</h2>
            <p className="text-[14px] leading-[1.5] text-cinza-600">
              Acesso restrito à equipe da BIG TECH STORE.
            </p>
          </div>

          <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="rotulo">
                E-mail corporativo
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErro("");
                }}
                placeholder="voce@bigtechstore.com.br"
                autoComplete="username"
                className={`campo ${erro ? "campo-erro" : ""}`}
                aria-invalid={!!erro}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="senha" className="rotulo">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro("");
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`campo ${erro ? "campo-erro" : ""}`}
                aria-invalid={!!erro}
                aria-describedby={erro ? "erro-login" : undefined}
              />
            </div>

            {erro && (
              <p
                id="erro-login"
                role="alert"
                className="rounded-lg border border-vermelho-borda bg-vermelho-claro px-3 py-2.5 text-[13px] leading-[1.45] text-vermelho-texto"
              >
                {erro}
              </p>
            )}

            <button type="submit" className="btn btn-cta mt-1 w-full">
              Entrar
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 rounded-xl border border-cinza-200 bg-cinza-50 p-4">
            <span className="t-label text-[10px] text-cinza-500">
              Acesso de demonstração
            </span>
            <span className="font-mono text-[13px] text-noite">
              {CREDENCIAL_DEMO.email}
            </span>
            <span className="font-mono text-[13px] text-noite">
              {CREDENCIAL_DEMO.senha}
            </span>
            <button
              type="button"
              onClick={preencherDemo}
              className="mt-1 self-start text-[13px] font-semibold text-azul underline"
            >
              Preencher automaticamente
            </button>
            <p className="mt-1 text-[12px] leading-[1.45] text-cinza-500">
              Autenticação mockada no front. O back-end assume esta validação na
              próxima etapa.
            </p>
          </div>

          <Link
            href="/"
            className="mt-6 inline-block text-[13px] font-semibold text-cinza-600 underline hover:text-azul"
          >
            ← Voltar para a loja
          </Link>
        </div>
      </div>
    </div>
  );
}
