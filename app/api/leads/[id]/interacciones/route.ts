import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { TipoInteraccion } from '@/lib/types';

const TIPOS_VALIDOS: TipoInteraccion[] = ['nota', 'llamada', 'mail', 'reunion', 'whatsapp'];

// POST /api/leads/:id/interacciones  { tipo, descripcion } -> registra una interacción
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
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

    const { data, error } = await supabase
      .from('interacciones')
      .insert({ lead_id: id, tipo, descripcion: descripcion.trim() })
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudo registrar la interacción' }, { status: 500 });
    }

    return NextResponse.json({ interaccion: data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado registrando la interacción' }, { status: 500 });
  }
}
