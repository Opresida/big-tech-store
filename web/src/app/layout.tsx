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

export const metadata: Metadata = {
  title: {
    default: "BIG TECH STORE — O melhor preço do Brasil",
    template: "%s · BIG TECH STORE",
  },
  description:
    "Consoles, celulares, notebooks, áudio e acessórios com nota fiscal, garantia e rastreio. Achou mais barato? A gente cobre.",
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
