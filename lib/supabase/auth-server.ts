import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { OrgMembership } from '@/lib/types';

// Nombre de la cookie que guarda cuál de las organizaciones del usuario está
// "activa" en esta sesión (relevante solo si pertenece a más de una).
export const ACTIVE_ORG_COOKIE = 'active_org_id';

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

// Todas las organizaciones del usuario logueado (con su rol en cada una),
// ordenadas por antigüedad de membership. Base de getCurrentOrgId() y del
// selector de org del sidebar.
export async function getUserMemberships(): Promise<OrgMembership[]> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('memberships')
    .select('org_id, role, organizations(nombre)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  return (data ?? []).map((m) => ({
    orgId: m.org_id,
    orgNombre: (m.organizations as unknown as { nombre: string } | null)?.nombre ?? '',
    role: m.role,
  }));
}

// Org "activa" de esta sesión, para que las API routes (que usan la service
// key y por lo tanto bypassan RLS) filtren leads/interacciones a mano. Un
// usuario puede pertenecer a varias orgs; la activa se guarda en una cookie
// (ver ACTIVE_ORG_COOKIE) y, si no hay cookie o no es una de las suyas, cae
// a la membership más antigua.
export async function getCurrentOrgId(): Promise<string | null> {
  const memberships = await getUserMemberships();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const active = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (active && memberships.some((m) => m.orgId === active)) {
    return active;
  }

  return memberships[0].orgId;
}

// Rol del usuario en la org activa, para los checks de permisos de
// invitar/revocar/gestionar miembros.
export async function getCurrentMembership(): Promise<OrgMembership | null> {
  const memberships = await getUserMemberships();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const active = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  return memberships.find((m) => m.orgId === active) ?? memberships[0];
}
