import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentMembership } from '@/lib/supabase/auth-server';

// GET /api/orgs/active -> detalle completo de la org activa: nombre, tu rol,
// miembros (con email) e invitaciones pendientes que mandó esa org. Es la
// data que consume /organizacion.
export async function GET() {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const supabase = createServiceClient();

    const [membersRes, invitationsRes] = await Promise.all([
      supabase
        .from('memberships')
        .select('user_id, role, profiles(email)')
        .eq('org_id', membership.orgId),
      supabase
        .from('invitations')
        .select('id, email, created_at')
        .eq('org_id', membership.orgId)
        .order('created_at', { ascending: false }),
    ]);

    if (membersRes.error || invitationsRes.error) {
      console.error(membersRes.error ?? invitationsRes.error);
      return NextResponse.json({ error: 'No se pudo leer la organización' }, { status: 500 });
    }

    const members = (membersRes.data ?? []).map((m) => ({
      id: m.user_id,
      email: (m.profiles as unknown as { email: string } | null)?.email ?? '',
      role: m.role,
    }));

    return NextResponse.json({
      id: membership.orgId,
      nombre: membership.orgNombre,
      myRole: membership.role,
      members,
      sentInvitations: invitationsRes.data ?? [],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado leyendo la organización' }, { status: 500 });
  }
}
