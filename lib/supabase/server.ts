import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente para uso en API routes / server components.
// Usa la service role key (bypassa RLS) — NUNCA exponer esta key al browser.
// Solo se importa desde archivos que corren en el servidor (app/api/**).
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// Cliente con anon key + cookies de la request, para usar en Route Handlers
// que necesitan leer/escribir la sesión del usuario (ej. el callback de
// recuperación de contraseña). A diferencia de createServiceClient, respeta
// RLS y solo puede actuar como el usuario autenticado (o nadie).
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
