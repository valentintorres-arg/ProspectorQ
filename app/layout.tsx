import type { Metadata } from "next";
import { Geist, Hanken_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { getUser } from "@/lib/supabase/auth-server";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import AppShell from "@/components/AppShell";

const geist = Geist({ subsets: ["latin"], weight: "variable", variable: "--font-geist" });
const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-hanken-grotesk",
});
const inter = Inter({ subsets: ["latin"], weight: "variable", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Prospector",
  description: "Prospección de negocios por zona para valtinq",
};

// Corre antes del primer paint para evitar el flash de tema equivocado:
// respeta la preferencia guardada, o el sistema operativo si nunca se tocó
// el toggle manual. De paso deja <html lang> correcto desde el arranque.
const INIT_SCRIPT = `
(function () {
  try {
    var storedTheme = localStorage.getItem('prospector-theme');
    var dark = storedTheme ? storedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
  try {
    var storedLang = localStorage.getItem('prospector-lang');
    if (storedLang === 'en' || storedLang === 'es') document.documentElement.lang = storedLang;
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();

  return (
    <html
      lang="es"
      className={`h-full antialiased ${geist.variable} ${hankenGrotesk.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- regla pensada para Pages Router; en App Router el <link> global va en el root layout */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-surface font-body text-on-surface" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: INIT_SCRIPT }} />
        <LanguageProvider>
          {!user ? (
            <main className="flex min-h-screen flex-col bg-gradient-to-br from-surface via-surface to-primary-container/20">
              {children}
            </main>
          ) : (
            <AppShell email={user.email ?? ''}>{children}</AppShell>
          )}
        </LanguageProvider>
      </body>
    </html>
  );
}
