export type Depoimento = {
  nome: string;
  local: string;
  nota: number;
  data: string;
  titulo: string;
  texto: string;
  compraVerificada: boolean;
};

const AUTORES = [
  { nome: "Rafael M.", local: "Campinas, SP" },
  { nome: "Juliana P.", local: "Belo Horizonte, MG" },
  { nome: "Anderson L.", local: "Curitiba, PR" },
  { nome: "Priscila R.", local: "Recife, PE" },
  { nome: "Thiago F.", local: "Porto Alegre, RS" },
  { nome: "Camila S.", local: "Salvador, BA" },
  { nome: "Douglas A.", local: "Goiânia, GO" },
  { nome: "Letícia B.", local: "Fortaleza, CE" },
  { nome: "Marcos V.", local: "São Paulo, SP" },
  { nome: "Fernanda C.", local: "Manaus, AM" },
  { nome: "Eduardo N.", local: "Florianópolis, SC" },
  { nome: "Patrícia D.", local: "Brasília, DF" },
];

const MODELOS: {
  nota: number;
  titulo: string;
  texto: (nome: string) => string;
}[] = [
  {
    nota: 5,
    titulo: "Chegou antes do prazo",
    texto: (n) =>
      `Comprei ${n} na quinta e chegou na segunda, lacrado e com nota fiscal. Preço foi o melhor que achei depois de rodar cinco sites.`,
  },
  {
    nota: 5,
    titulo: "Original e bem embalado",
    texto: (n) =>
      `Confesso que fiquei receoso com o preço do ${n}, mas veio tudo certo: caixa lacrada, garantia no site do fabricante e rastreio funcionando o tempo todo.`,
  },
  {
    nota: 5,
    titulo: "Segunda compra na loja",
    texto: () =>
      "Já é a segunda vez que compro aqui e não tenho reclamação. Pix cai na hora e o pedido sai no mesmo dia. Atendimento responde no WhatsApp de verdade.",
  },
  {
    nota: 4,
    titulo: "Bom produto, entrega podia ser mais rápida",
    texto: (n) =>
      `O ${n} é exatamente o descrito e o preço compensa. Só demorou dois dias a mais que a previsão, mas o suporte avisou antes.`,
  },
  {
    nota: 5,
    titulo: "Recomendo pra quem revende",
    texto: () =>
      "Compro em quantidade pra minha loja e o preço fecha bem melhor que no distribuidor. Nota fiscal certinha, sem dor de cabeça no fisco.",
  },
  {
    nota: 5,
    titulo: "Valeu cada real",
    texto: (n) =>
      `Pesquisei muito antes de fechar o ${n}. Aqui saiu mais barato e ainda parcelei em 12x sem juros. Recomendo sem medo.`,
  },
  {
    nota: 4,
    titulo: "Atendeu o que prometia",
    texto: (n) =>
      `O ${n} veio certinho e funciona bem. Embalagem podia ter mais proteção, mas o produto chegou sem nenhum arranhão.`,
  },
  {
    nota: 5,
    titulo: "Suporte resolveu na hora",
    texto: () =>
      "Errei o endereço no pedido e consegui corrigir antes do envio pelo chat. Poucas lojas fazem isso tão rápido.",
  },
];

/** Hash estável — mesmos depoimentos para o mesmo produto, sempre. */
function hash(texto: string) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const DIA = 86400000;

export function depoimentosDe(
  produtoId: string,
  nomeProduto: string,
  quantidade = 4,
): Depoimento[] {
  const semente = hash(produtoId);
  // Nome curto para caber no corpo do depoimento.
  const curto = nomeProduto.split(" ").slice(0, 3).join(" ");

  return Array.from({ length: quantidade }, (_, i) => {
    const autor = AUTORES[(semente + i * 5) % AUTORES.length];
    const modelo = MODELOS[(semente + i * 3) % MODELOS.length];
    const diasAtras = 3 + ((semente + i * 11) % 40);
    return {
      nome: autor.nome,
      local: autor.local,
      nota: modelo.nota,
      titulo: modelo.titulo,
      texto: modelo.texto(curto),
      compraVerificada: (semente + i) % 7 !== 0,
      data: new Date(Date.UTC(2026, 7, 5) - diasAtras * DIA).toISOString(),
    };
  });
}

/** Distribuição de notas coerente com a média do produto. */
export function distribuicaoNotas(nota: number, total: number) {
  const pesos =
    nota >= 4.85
      ? [0.88, 0.09, 0.02, 0.005, 0.005]
      : nota >= 4.7
        ? [0.8, 0.13, 0.04, 0.02, 0.01]
        : nota >= 4.5
          ? [0.7, 0.18, 0.07, 0.03, 0.02]
          : [0.6, 0.22, 0.1, 0.05, 0.03];
  return pesos.map((p, i) => ({
    estrelas: 5 - i,
    quantidade: Math.round(total * p),
    percentual: Math.round(p * 100),
  }));
}
