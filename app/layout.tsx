import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlyerPro — seu designer com linha editorial",
  description:
    "Gere artes para sua empresa mantendo identidade visual e linha editorial consistentes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
