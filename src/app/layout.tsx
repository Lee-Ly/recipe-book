import type { Metadata, Viewport } from "next";
import { DM_Sans, Open_Sans } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import TimerDock from "@/components/TimerDock";
import { isAuthed } from "@/lib/auth";
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
  icons: { icon: "/pwa-icon/192", apple: "/pwa-icon/180" },
  appleWebApp: { capable: true, title: "Recipes", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fffefd",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const authed = await isAuthed();
  return (
    <html lang="he" dir="rtl" className={`${dmSans.variable} ${openSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-8">{children}</main>
        {authed && (
          <footer className="border-t border-line">
            <div className="mx-auto flex max-w-5xl justify-center px-5 py-3">
              <LogoutButton />
            </div>
          </footer>
        )}
        <TimerDock />
      </body>
    </html>
  );
}
