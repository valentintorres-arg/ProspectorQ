import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente para Server Components que necesita leer la sesión del usuario
// logueado (a diferencia de createServiceClient en server.ts, que bypassa
// RLS con la service key). Usa la anon key + las cookies de la request.
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Un Server Component no puede escribir cookies; proxy.ts ya
            // se encarga de refrescar la sesión en cada request.
          }
        },
      },
    }
  );
}

export async function getUser() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
