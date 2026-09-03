import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentOrgId } from '@/lib/supabase/auth-server';

// GET /api/zonas -> zonas de la org activa, con la cantidad de negocios encontrados en cada una
export async function GET() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('zonas')
      .select('id, nombre, created_at, negocios(count)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudieron leer las zonas' }, { status: 500 });
    }

    const zonas = (data ?? []).map((z) => ({
      id: z.id,
      nombre: z.nombre,
      created_at: z.created_at,
      negocios_count: (z.negocios as { count: number }[])[0]?.count ?? 0,
    }));

    return NextResponse.json({ zonas });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado leyendo las zonas' }, { status: 500 });
  }
}
