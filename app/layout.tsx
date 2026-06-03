import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ApexProvider } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import HealthBridge from "@/components/HealthBridge";
import LogSheet from "@/components/LogSheet";
import GlobalLogButton from "@/components/GlobalLogButton";

// ─── Fonts ─────────────────────────────────────────────────────────────────────
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-body",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-mono",
  display: "swap",
});

// ─── Metadata ──────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Apex",
  description: "Your personal operating system.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Apex",
  },
};

export const viewport: Viewport = {
  themeColor: "#060606",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${hanken.variable} ${jetbrains.variable}`}
      style={{ background: "#060606" }}
    >
      <head>
        {/* Material Symbols — needed for tab icons, cards, etc. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body style={{ background: "#060606" }}>
        <ApexProvider>
          <HealthBridge />

          <main className="page-container">
            {children}
          </main>

          {/* Global chrome — rendered on all pages inside the provider */}
          <BottomNav />
          <GlobalLogButton />
          <LogSheet />
        </ApexProvider>
      </body>
    </html>
  );
}
