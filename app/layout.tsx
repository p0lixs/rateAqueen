import type { Metadata, Viewport } from "next";
import "./globals.css";
import MobileNav from "@/components/mobile-nav";
import { I18nProvider } from "@/components/i18n-provider";
import { SpeedInsights } from "@vercel/speed-insights/next"
export const metadata: Metadata = {
  title: "Rate a Queen",
  description: "Crea una clasificación anónima con tus amigas",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rate a Queen",
  },
};

export const viewport: Viewport = {
  themeColor: "#171019",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body><I18nProvider>{children}<MobileNav /></I18nProvider></body>
      <SpeedInsights/>
    </html>
  );
}
