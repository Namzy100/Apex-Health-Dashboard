import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ApexProvider } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import HealthBridge from "@/components/HealthBridge";

export const metadata: Metadata = {
  title: "Apex",
  description: "Your personal operating system.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Apex" },
};

export const viewport: Viewport = {
  themeColor: "#09080a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: "#09080a" }}>
      <body style={{ background: "#09080a" }}>
        <ApexProvider>
          <HealthBridge />
          <main className="page-container">
            {children}
          </main>
          <BottomNav />
        </ApexProvider>
      </body>
    </html>
  );
}
