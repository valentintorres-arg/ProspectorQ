import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/leads?etapa=contactado  -> lista leads (con el negocio embebido), filtrable por etapa
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const etapa = req.nextUrl.searchParams.get('etapa');

    let query = supabase
      .from('leads')
      .select('*, negocio:negocios(*)')
      .order('updated_at', { ascending: false });

    if (etapa) {
      query = query.eq('etapa', etapa);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudieron leer los leads' }, { status: 500 });
    }

    return NextResponse.json({ leads: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No se pudieron leer los leads' }, { status: 500 });
  }
}

// POST /api/leads  { negocioId } -> crea un lead en etapa "identificado" para ese negocio
// POST /api/leads  { negocioIds: [...] } -> variante bulk: crea los que falten, ignora
// silenciosamente los negocios que ya tienen lead (para "agregar todos" desde el mapa)
export async function POST(req: NextRequest) {
  const supabase = createServiceClient();

  try {
    const body = await req.json();

    if (Array.isArray(body.negocioIds)) {
      const negocioIds: string[] = body.negocioIds;
      if (negocioIds.length === 0) {
        return NextResponse.json({ error: 'Falta negocioIds' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('leads')
        .upsert(
          negocioIds.map((id) => ({ negocio_id: id })),
          { onConflict: 'negocio_id', ignoreDuplicates: true }
        )
        .select('*, negocio:negocios(*)');

      if (error) {
        console.error(error);
        return NextResponse.json({ error: 'No se pudieron crear los leads' }, { status: 500 });
      }

      return NextResponse.json({ leads: data }, { status: 201 });
    }

    const negocioId: string = body.negocioId;

    if (!negocioId) {
      return NextResponse.json({ error: 'Falta negocioId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({ negocio_id: negocioId })
      .select('*, negocio:negocios(*)')
      .single();

    if (error) {
      // Conflicto de unique (negocio_id) = ya existe un lead para ese negocio
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ese negocio ya está en el pipeline' }, { status: 409 });
      }
      console.error(error);
      return NextResponse.json({ error: 'No se pudo crear el lead' }, { status: 500 });
    }

    return NextResponse.json({ lead: data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado creando el lead' }, { status: 500 });
  }
}
