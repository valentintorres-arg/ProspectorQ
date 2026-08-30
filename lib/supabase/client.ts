import { createBrowserClient } from '@supabase/ssr';

// Cliente para uso en el navegador (componentes 'use client').
// Usa la anon key — segura para exponer al cliente porque las políticas
// de RLS en Supabase son las que controlan qué se puede leer/escribir.
// createBrowserClient (en vez de createClient a secas) guarda la sesión en
// cookies en lugar de localStorage, así el middleware y los server
// components pueden leerla también.
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createBrowserClient(url, anonKey);
}
