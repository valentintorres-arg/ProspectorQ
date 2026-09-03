import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentOrgId } from '@/lib/supabase/auth-server';

// GET /api/zonas/:id -> { nombre, polygon } para poder redibujarla en el mapa
// y volver a buscar sobre ella sin que el usuario la trace de nuevo.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const supabase = createServiceClient();

    const { data: zona, error: zonaError } = await supabase
      .from('zonas')
      .select('id, nombre')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (zonaError) {
      console.error(zonaError);
      return NextResponse.json({ error: 'Zona no encontrada' }, { status: 404 });
    }

    const { data: geojsonStr, error: geoError } = await supabase.rpc('zona_geojson', { p_id: id });

    if (geoError || !geojsonStr) {
      console.error(geoError);
      return NextResponse.json({ error: 'No se pudo leer el polígono de la zona' }, { status: 500 });
    }

    return NextResponse.json({
      id: zona.id,
      nombre: zona.nombre,
      polygon: JSON.parse(geojsonStr) as GeoJSON.Polygon,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado leyendo la zona' }, { status: 500 });
  }
}
