import type { Metadata } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "ボートとエンジンの運搬担当を日付単位で管理する日本語PWAです。",
  icons: {
    icon: "/boad.png",
    apple: "/boad.png",
    shortcut: "/boad.png"
  },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
