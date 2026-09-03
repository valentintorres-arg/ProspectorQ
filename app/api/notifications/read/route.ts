import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentMembership, getUser } from '@/lib/supabase/auth-server';

// POST /api/notifications/read -> marca como vistas las notificaciones de
// la org activa (se llama al abrir la campanita). Los leads vencidos y las
// invitaciones recibidas no tienen "visto": siguen contando hasta que se
// resuelven (se actualiza el lead / se acepta o rechaza la invitación).
export async function POST() {
  try {
    const membership = await getCurrentMembership();
    const user = await getUser();
    if (!membership || !user) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('memberships')
      .update({ notifications_last_seen_at: new Date().toISOString() })
      .eq('org_id', membership.orgId)
      .eq('user_id', user.id);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudo marcar como leído' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}
