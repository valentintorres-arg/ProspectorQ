import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { Etapa } from '@/lib/types';

const ETAPAS_VALIDAS: Etapa[] = [
  'identificado',
  'contactado',
  'en_conversacion',
  'propuesta',
  'ganado',
  'perdido',
];

// GET /api/leads/:id  -> el lead con su negocio y el historial de interacciones
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabase = createServiceClient();

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, negocio:negocios(*)')
      .eq('id', id)
      .single();

    if (leadError) {
      console.error(leadError);
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    const { data: interacciones, error: interaccionesError } = await supabase
      .from('interacciones')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    if (interaccionesError) {
      console.error(interaccionesError);
      return NextResponse.json({ error: 'No se pudieron leer las interacciones' }, { status: 500 });
    }

    return NextResponse.json({ lead, interacciones });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado leyendo el lead' }, { status: 500 });
  }
}

// PATCH /api/leads/:id  { etapa?, proximaAccion?, proximaAccionFecha?, notas? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (body.etapa !== undefined) {
      if (!ETAPAS_VALIDAS.includes(body.etapa)) {
        return NextResponse.json({ error: 'Etapa inválida' }, { status: 400 });
      }
      update.etapa = body.etapa;
    }
    if (body.proximaAccion !== undefined) update.proxima_accion = body.proximaAccion;
    if (body.proximaAccionFecha !== undefined) update.proxima_accion_fecha = body.proximaAccionFecha;
    if (body.notas !== undefined) update.notas = body.notas;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leads')
      .update(update)
      .eq('id', id)
      .select('*, negocio:negocios(*)')
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudo actualizar el lead' }, { status: 500 });
    }

    return NextResponse.json({ lead: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado actualizando el lead' }, { status: 500 });
  }
}

// DELETE /api/leads/:id
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from('leads').delete().eq('id', id);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudo borrar el lead' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado borrando el lead' }, { status: 500 });
  }
}
