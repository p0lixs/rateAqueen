import type { Metadata } from "next";
import "./globals.css";
import MobileNav from "@/components/mobile-nav";
import { I18nProvider } from "@/components/i18n-provider";
import { SpeedInsights } from "@vercel/speed-insights/next"
export const metadata: Metadata = {
  title: "Rate a Queen",
  description: "Crea una clasificación anónima con tus amigas",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><I18nProvider>{children}<MobileNav /></I18nProvider></body>
      <SpeedInsights/>
    </html>
  );
}
