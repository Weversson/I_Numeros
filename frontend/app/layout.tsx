import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reconhecimento de Dígitos Manuscritos",
  description:
    "Aplicação de reconhecimento de dígitos manuscritos de 0 a 9, baseada em uma rede neural multicamadas treinada com o conjunto MNIST.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
