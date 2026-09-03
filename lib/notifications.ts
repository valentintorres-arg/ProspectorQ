import type { SupabaseClient } from '@supabase/supabase-js';

export type NotificationTipo =
  | 'lead_creado'
  | 'lead_etapa_cambiada'
  | 'lead_actualizado'
  | 'lead_eliminado'
  | 'interaccion_agregada'
  | 'miembro_sumado';

// Nunca tira: si falla el insert de la notificación, no queremos tumbar la
// acción principal (crear/editar un lead, aceptar una invitación) por un
// problema en el centro de notificaciones.
export async function crearNotificacion(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    actorId: string;
    tipo: NotificationTipo;
    leadId?: string;
    detalle?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from('notifications').insert({
    org_id: params.orgId,
    actor_id: params.actorId,
    tipo: params.tipo,
    lead_id: params.leadId ?? null,
    detalle: params.detalle ?? {},
  });

  if (error) {
    console.error('Error creando notificación:', error);
  }
}
