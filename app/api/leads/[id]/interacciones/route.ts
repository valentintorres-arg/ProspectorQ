import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentOrgId, getUser } from '@/lib/supabase/auth-server';
import { crearNotificacion } from '@/lib/notifications';
import type { TipoInteraccion } from '@/lib/types';

const TIPOS_VALIDOS: TipoInteraccion[] = ['nota', 'llamada', 'mail', 'reunion', 'whatsapp'];

// POST /api/leads/:id/interacciones  { tipo, descripcion } -> registra una interacción
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const supabase = createServiceClient();
    const body = await req.json();
    const tipo: TipoInteraccion = body.tipo;
    const descripcion: string = body.descripcion;

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de interacción inválido' }, { status: 400 });
    }
    if (!descripcion || !descripcion.trim()) {
      return NextResponse.json({ error: 'Falta descripcion' }, { status: 400 });
    }

    // El lead tiene que ser de esta org antes de dejar registrar nada en él
    // (si no, cualquier cuenta aprobada podría loguear interacciones sobre
    // el id de un lead ajeno con solo adivinarlo).
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, negocio:negocios(nombre)')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('interacciones')
      .insert({ lead_id: id, org_id: orgId, tipo, descripcion: descripcion.trim() })
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudo registrar la interacción' }, { status: 500 });
    }

    const user = await getUser();
    if (user) {
      const negocioNombre = (lead.negocio as unknown as { nombre: string } | null)?.nombre;
      await crearNotificacion(supabase, {
        orgId,
        actorId: user.id,
        tipo: 'interaccion_agregada',
        leadId: id,
        detalle: { negocioNombre, tipoInteraccion: tipo },
      });
    }

    return NextResponse.json({ interaccion: data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado registrando la interacción' }, { status: 500 });
  }
}
