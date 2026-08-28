import { createClient } from '@supabase/supabase-js';

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
