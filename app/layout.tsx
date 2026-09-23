import type { Metadata } from "next";
import { Inter, Playfair_Display, Caveat, Cinzel } from "next/font/google";
import "./globals.css";
import "./tokens.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

// Só pro card de identidade do hero do memorial (app/homenagem/[slug]/page.tsx),
// copiado do wireframe do Pedro (14/09/2026) -- não usada em mais nada.
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
});

// Só pra assinatura cursiva do Livro de Assinaturas — não usada em mais nada da página.
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-assinatura",
});

export const metadata: Metadata = {
  title: "Legado Digital — Memoriais Digitais para o Setor Funerário",
  description:
    "Transforme o luto em legado permanente. Plataforma SaaS de memoriais digitais com QR Code para o setor funerário.",
  keywords: ["memorial digital", "qr code funerária", "homenagem online", "velório virtual", "legado digital"],
  openGraph: {
    title: "Legado Digital — Memoriais Digitais",
    description: "Preservando histórias para sempre. Memoriais digitais com QR Code.",
    type: "website",
    locale: "pt_BR",
    siteName: "Legado Digital",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${playfair.variable} ${caveat.variable} ${cinzel.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}