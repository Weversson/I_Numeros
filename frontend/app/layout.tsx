import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reconhecedor de Números",
  description:
    "Desenhe um dígito de 0 a 9 e uma rede neural em Python o reconhece em tempo real usando uma matriz de bits 28×28.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
