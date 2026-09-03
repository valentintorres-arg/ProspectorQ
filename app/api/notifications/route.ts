import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentMembership, getUser } from '@/lib/supabase/auth-server';

// GET /api/notifications -> feed combinado para la campanita: actividad
// guardada sobre leads de la org activa (sin contar tus propias acciones),
// leads vencidos de esa org (calculados al vuelo, no se guardan) e
// invitaciones pendientes a tu email (de cualquier org).
export async function GET() {
  try {
    const membership = await getCurrentMembership();
    const user = await getUser();
    if (!membership || !user) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const supabase = createServiceClient();
    const hoy = new Date().toISOString().slice(0, 10);

    const [notifRes, vencidosRes, invitacionesRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('id, tipo, actor_id, lead_id, detalle, created_at')
        .eq('org_id', membership.orgId)
        .neq('actor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('leads')
        .select('id, proxima_accion_fecha, negocio:negocios(nombre)')
        .eq('org_id', membership.orgId)
        .lt('proxima_accion_fecha', hoy)
        .not('etapa', 'in', '(ganado,perdido)'),
      supabase
        .from('invitations')
        .select('id, created_at, org_id, organizations(nombre)')
        .ilike('email', user.email!)
        .order('created_at', { ascending: false }),
    ]);

    if (notifRes.error || vencidosRes.error || invitacionesRes.error) {
      console.error(notifRes.error ?? vencidosRes.error ?? invitacionesRes.error);
      return NextResponse.json({ error: 'No se pudieron leer las notificaciones' }, { status: 500 });
    }

    const actorIds = [...new Set((notifRes.data ?? []).map((n) => n.actor_id).filter(Boolean))] as string[];
    const { data: actores } = actorIds.length
      ? await supabase.from('profiles').select('id, email').in('id', actorIds)
      : { data: [] as { id: string; email: string }[] };
    const emailByActorId = new Map((actores ?? []).map((a) => [a.id, a.email]));

    const items = [
      ...(notifRes.data ?? []).map((n) => ({
        id: `notif-${n.id}`,
        tipo: n.tipo,
        detalle: { ...(n.detalle as Record<string, unknown>), actorEmail: emailByActorId.get(n.actor_id ?? '') },
        leadId: n.lead_id,
        createdAt: n.created_at,
      })),
      ...(vencidosRes.data ?? []).map((l) => ({
        id: `vencido-${l.id}`,
        tipo: 'lead_vencido' as const,
        detalle: {
          negocioNombre: (l.negocio as unknown as { nombre: string } | null)?.nombre,
          proximaAccionFecha: l.proxima_accion_fecha,
        },
        leadId: l.id,
        createdAt: l.proxima_accion_fecha,
      })),
      ...(invitacionesRes.data ?? []).map((i) => ({
        id: `invite-${i.id}`,
        tipo: 'invitacion_recibida' as const,
        detalle: { orgNombre: (i.organizations as unknown as { nombre: string } | null)?.nombre },
        invitationId: i.id,
        createdAt: i.created_at,
      })),
    ].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

    const unreadNotifCount = (notifRes.data ?? []).filter(
      (n) => new Date(n.created_at) > new Date(membership.notificationsLastSeenAt)
    ).length;
    const unreadCount = unreadNotifCount + (vencidosRes.data ?? []).length + (invitacionesRes.data ?? []).length;

    return NextResponse.json({ items, unreadCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado leyendo las notificaciones' }, { status: 500 });
  }
}
