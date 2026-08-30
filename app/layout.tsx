import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getUser } from "@/lib/supabase/auth-server";
import LogoutButton from "@/components/LogoutButton";

export const metadata: Metadata = {
  title: "Prospector",
  description: "Prospección de negocios por zona para valtinq",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getUser();

  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <header className="flex items-center justify-between gap-3 overflow-x-auto border-b border-gray-200 px-4 py-3 sm:gap-6 sm:px-6">
          <div className="flex shrink-0 items-center gap-4 sm:gap-6">
            <span className="shrink-0 font-semibold">Prospector</span>
            {user && (
              <nav className="flex shrink-0 gap-3 text-sm text-gray-600 sm:gap-4">
                <Link href="/mapa" className="hover:text-black">
                  Mapa
                </Link>
                <Link href="/zonas" className="hover:text-black">
                  Zonas
                </Link>
                <Link href="/pipeline" className="hover:text-black">
                  Pipeline
                </Link>
                <Link href="/dashboard" className="hover:text-black">
                  Dashboard
                </Link>
              </nav>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="hidden truncate sm:inline">{user.email}</span>
              <LogoutButton />
            </div>
          )}
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
