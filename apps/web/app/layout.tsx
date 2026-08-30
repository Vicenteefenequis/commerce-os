import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Commerce OS",
  description: "Commerce OS admin",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
