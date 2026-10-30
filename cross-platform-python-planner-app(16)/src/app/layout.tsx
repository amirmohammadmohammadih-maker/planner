import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Mounted from "@/components/Mounted";
import PwaRegister from "@/components/PwaRegister";
import ShellBridge from "@/components/ShellBridge";
import ThemeProvider from "@/components/ThemeProvider";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { REMOTE_BOOT_SCRIPT } from "@/lib/remote";

const IS_MOBILE_BUILD = process.env.NEXT_PUBLIC_PLANNER_TARGET === "mobile";

export const metadata: Metadata = {
  title: "پلنر جامع | برنامه‌ریزی، عادت‌ها، مالی و تحصیلی",
  description: "پلنر حرفه‌ای: پلنر هفتگی، تقویم، تایم‌لاین، تایم‌شیت، هبیت ترکر، ردیاب مالی، پلنر تحصیلی و ارزیابی عملکرد.",
  manifest: "/manifest.json",
  applicationName: "پلنر جامع",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "پلنر جامع" },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        {IS_MOBILE_BUILD && <script dangerouslySetInnerHTML={{ __html: REMOTE_BOOT_SCRIPT }} />}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout applies to every page */}
        <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <ThemeProvider>
          <PwaRegister />
          <ShellBridge />
          <Sidebar />
          <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-5 lg:mr-64 lg:px-8 lg:pb-10 lg:pt-8">
            <Mounted>{children}</Mounted>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
