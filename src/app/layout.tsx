import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { DM_Sans, Open_Sans } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import TimerDock from "@/components/TimerDock";
import { getRole } from "@/lib/auth";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

// DM Sans has no Hebrew letters, so Hebrew text falls through to Open Sans.
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "My Recipe Book",
  description: "A personal recipe book",
  robots: { index: false, follow: false },
  icons: { icon: "/pwa-icon/192", apple: "/pwa-icon/180" },
  appleWebApp: { capable: true, title: "Recipes", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fffefd",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const role = await getRole();
  return (
    <html lang="he" dir="rtl" className={`${dmSans.variable} ${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-8">{children}</main>
        {role && (
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-5 py-3">
              {role === "owner" && (
                <>
                  <Link href="/manage" className="py-1 text-xs font-semibold text-muted transition hover:text-foreground active:text-foreground">
                    Categories &amp; Tags
                  </Link>
                  <Link href="/access" className="py-1 text-xs font-semibold text-muted transition hover:text-foreground active:text-foreground">
                    Friends&apos; Access
                  </Link>
                </>
              )}
              <LogoutButton />
            </div>
          </footer>
        )}
        <TimerDock />
      </body>
    </html>
  );
}
