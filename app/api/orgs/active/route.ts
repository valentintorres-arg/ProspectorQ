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
      supabase.from('memberships').select('user_id, role').eq('org_id', membership.orgId),
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

    // memberships.user_id y profiles.id apuntan los dos a auth.users, pero
    // no hay FK entre memberships y profiles, así que PostgREST no puede
    // embeber profiles(email) directo en el select de arriba — se resuelve
    // con una segunda query.
    const userIds = (membersRes.data ?? []).map((m) => m.user_id);
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    if (profilesError) {
      console.error(profilesError);
      return NextResponse.json({ error: 'No se pudo leer la organización' }, { status: 500 });
    }

    const emailById = new Map((profilesData ?? []).map((p) => [p.id, p.email]));
    const members = (membersRes.data ?? []).map((m) => ({
      id: m.user_id,
      email: emailById.get(m.user_id) ?? '',
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
