import type { Metadata, Viewport } from "next";
import { Archivo, Archivo_Black, IBM_Plex_Mono } from "next/font/google";
import { LojaProvider } from "@/lib/loja";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

const SITE = "https://bigtechstor.netlify.app";

const TITULO = "BIG TECH STORE — O melhor preço do Brasil";
const DESCRICAO =
  "Consoles, celulares, notebooks, áudio e acessórios com nota fiscal, garantia e rastreio. 12x sem juros e 5% de desconto no Pix. Achou mais barato? A gente cobre.";

export const metadata: Metadata = {
  // Base para resolver as URLs relativas de OG, canonical e ícones.
  metadataBase: new URL(SITE),
  title: {
    default: TITULO,
    template: "%s · BIG TECH STORE",
  },
  description: DESCRICAO,
  applicationName: "BIG TECH STORE",
  keywords: [
    "PS5",
    "PlayStation 5",
    "Xbox",
    "celular",
    "iPhone",
    "notebook gamer",
    "caixa de som JBL",
    "controle DualSense",
    "loja de eletrônicos",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE,
    siteName: "BIG TECH STORE",
    title: TITULO,
    description: DESCRICAO,
    // A imagem vem de app/opengraph-image.png pela convenção de arquivo do
    // Next — ele injeta URL, dimensões e tipo sozinho.
  },
  twitter: {
    card: "summary_large_image",
    title: TITULO,
    description: DESCRICAO,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#0B37D6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${archivoBlack.variable} ${plexMono.variable}`}
    >
      <body>
        <LojaProvider>{children}</LojaProvider>
      </body>
    </html>
  );
}
