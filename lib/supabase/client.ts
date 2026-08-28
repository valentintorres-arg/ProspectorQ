import { createClient } from '@supabase/supabase-js';

// Cliente para uso en el navegador (componentes 'use client').
// Usa la anon key — segura para exponer al cliente porque las políticas
// de RLS en Supabase son las que controlan qué se puede leer/escribir.
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey);
}
