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

const SITE = "https://legadodigital.net";
const DESCRICAO =
  "Preserve a história de quem você ama numa página de homenagem com fotos, vídeos e QR Code na lápide. Busque um memorial, ache o cemitério e o caminho até o túmulo.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Legado Digital — Memorial digital com QR Code para a sua família",
  description: DESCRICAO,
  keywords: ["memorial digital", "qr code lápide", "homenagem online", "memorial online", "legado digital"],
  openGraph: {
    title: "Legado Digital — Memorial digital com QR Code",
    description: "Preservando histórias para sempre. Memoriais digitais com QR Code na lápide.",
    type: "website",
    locale: "pt_BR",
    siteName: "Legado Digital",
    url: SITE,
    images: [
      {
        url: "/og-legado-digital.jpg",
        width: 1200,
        height: 630,
        alt: "Legado Digital — Preservando histórias",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Legado Digital — Memorial digital com QR Code",
    description: "Preservando histórias para sempre. Memoriais digitais com QR Code na lápide.",
    images: ["/og-legado-digital.jpg"],
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