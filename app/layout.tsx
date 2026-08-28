import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prospector",
  description: "Prospección de negocios por zona para valtinq",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <header className="flex items-center gap-6 border-b border-gray-200 px-6 py-3">
          <span className="font-semibold">Prospector</span>
          <nav className="flex gap-4 text-sm text-gray-600">
            <Link href="/mapa" className="hover:text-black">
              Mapa
            </Link>
            <Link href="/pipeline" className="hover:text-black">
              Pipeline
            </Link>
          </nav>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
