import { NextRequest, NextResponse } from 'next/server';
import * as turf from '@turf/turf';
import { createServiceClient } from '@/lib/supabase/server';
import { sonElMismoNegocio } from '@/lib/dedup';
import { buscarNegociosOverture } from '@/lib/overture';
import type { Negocio } from '@/lib/types';

// La consulta a Overture via DuckDB/httpfs puede tardar 15-30s (parquet
// grande escaneado por HTTP range-requests) — el default de Vercel (10-15s
// según plan) corta la función antes de que termine.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const polygon: GeoJSON.Polygon = body.polygon;
    const nombreZona: string = body.nombreZona ?? 'Zona sin nombre';

    if (!polygon || polygon.type !== 'Polygon') {
      return NextResponse.json({ error: 'Falta un polígono GeoJSON válido' }, { status: 400 });
    }

    const feature = turf.polygon(polygon.coordinates);
    const bbox = turf.bbox(feature) as [number, number, number, number];

    let candidatosOverture;
    try {
      candidatosOverture = await buscarNegociosOverture(bbox);
    } catch (err) {
      console.error('Overture error:', err);
      return NextResponse.json(
        { error: 'No se pudo consultar Overture Maps. Probá de nuevo en unos segundos.' },
        { status: 502 }
      );
    }

    // Filtrar por el polígono real (la consulta a Overture solo filtró por bbox, que es más ancho)
    const candidatos = candidatosOverture.filter((x) =>
      turf.booleanPointInPolygon(turf.point([x.lng, x.lat]), feature)
    );

    const supabase = createServiceClient();

    const { data: zonaId, error: zonaError } = await supabase.rpc('insert_zona', {
      p_nombre: nombreZona,
      p_geojson: JSON.stringify(polygon),
    });

    if (zonaError) {
      console.error('Error creando zona:', zonaError);
      return NextResponse.json({ error: 'No se pudo guardar la zona' }, { status: 500 });
    }

    if (candidatos.length === 0) {
      return NextResponse.json({ zonaId, negocios: [] });
    }

    // Dedup fino: volver a buscar sobre una zona superpuesta puede traer un
    // id de Overture nuevo para un negocio que ya habíamos guardado antes
    // (o desde otra fuente, ej. OSM de antes del cambio a Overture). El
    // unique(fuente, overture_id) de la tabla solo frena duplicados exactos
    // por id — acá comparamos por proximidad + similitud de nombre para
    // agarrar el resto.
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const { data: negociosExistentes } = await supabase
      .from('negocios')
      .select('*')
      .gte('lat', minLat)
      .lte('lat', maxLat)
      .gte('lng', minLng)
      .lte('lng', maxLng);

    const existentesEncontrados: Negocio[] = [];
    const candidatosUnicos: typeof candidatos = [];

    for (const c of candidatos) {
      const dupInterno = candidatosUnicos.some((k) => sonElMismoNegocio(k, c));
      if (dupInterno) continue;

      const dupExistente = (negociosExistentes ?? []).find((n) => sonElMismoNegocio(n, c));
      if (dupExistente) {
        if (!existentesEncontrados.some((n) => n.id === dupExistente.id)) {
          existentesEncontrados.push(dupExistente);
        }
        continue;
      }

      candidatosUnicos.push(c);
    }

    if (candidatosUnicos.length === 0) {
      return NextResponse.json({ zonaId, negocios: existentesEncontrados });
    }

    // Upsert por (fuente, overture_id) para no duplicar si volvés a buscar la misma zona
    const { data: negociosInsertados, error: insertError } = await supabase
      .from('negocios')
      .upsert(
        candidatosUnicos.map((c) => ({
          zona_id: zonaId,
          nombre: c.nombre,
          direccion: c.direccion,
          rubro: c.rubro,
          telefono: c.telefono,
          web: c.web,
          lat: c.lat,
          lng: c.lng,
          fuente: 'overture' as const,
          overture_id: c.overture_id,
          ultima_actualizacion: c.ultima_actualizacion,
        })),
        { onConflict: 'fuente,overture_id', ignoreDuplicates: false }
      )
      .select();

    if (insertError) {
      console.error('Error insertando negocios:', insertError);
      return NextResponse.json({ error: 'No se pudieron guardar los negocios encontrados' }, { status: 500 });
    }

    return NextResponse.json({
      zonaId,
      negocios: [...existentesEncontrados, ...(negociosInsertados ?? [])],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado buscando la zona' }, { status: 500 });
  }
}
