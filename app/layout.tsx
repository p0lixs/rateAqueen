import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rate a Queen",
  description: "Crea una clasificación anónima con tus amigas",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
