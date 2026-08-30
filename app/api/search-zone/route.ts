import { NextRequest, NextResponse } from 'next/server';
import * as turf from '@turf/turf';
import { createServiceClient } from '@/lib/supabase/server';
import { sonElMismoNegocio } from '@/lib/dedup';
import type { Negocio } from '@/lib/types';

// Tags de Overpass que consideramos "negocio". Ajustá esta lista según el
// rubro que estés prospectando (ej: agregar shop=supermarket puntual, o
// sacar amenity=* si te interesan solo comercios).
const OVERPASS_QUERY_TAGS = ['shop', 'amenity', 'office', 'craft'];

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function buildOverpassQuery(bbox: [number, number, number, number]): string {
  // bbox turf = [minX(lng), minY(lat), maxX(lng), maxY(lat)]
  // Overpass bbox = south,west,north,east = minLat,minLng,maxLat,maxLng
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const bboxStr = `${minLat},${minLng},${maxLat},${maxLng}`;

  const clauses = OVERPASS_QUERY_TAGS.map(
    (tag) => `node["${tag}"](${bboxStr});way["${tag}"](${bboxStr});`
  ).join('\n    ');

  return `
    [out:json][timeout:25];
    (
      ${clauses}
    );
    out center tags;
  `;
}

function nombreDeNegocio(tags: Record<string, string>): string | null {
  return tags.name ?? null;
}

function rubroDeNegocio(tags: Record<string, string>): string | null {
  return tags.shop ?? tags.amenity ?? tags.office ?? tags.craft ?? null;
}

function direccionDeNegocio(tags: Record<string, string>): string | null {
  const calle = tags['addr:street'];
  const numero = tags['addr:housenumber'];
  if (calle && numero) return `${calle} ${numero}`;
  if (calle) return calle;
  return null;
}

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

    const overpassQuery = buildOverpassQuery(bbox);

    const overpassRes = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      // Apache/mod_security de Overpass devuelve 406 a requests sin User-Agent
      // (Node's fetch no manda uno por default, a diferencia de curl/navegadores).
      headers: { 'Content-Type': 'text/plain', 'User-Agent': 'prospector-app (github.com; contacto via app)' },
      body: overpassQuery,
    });

    if (!overpassRes.ok) {
      const text = await overpassRes.text();
      console.error('Overpass error:', overpassRes.status, text.slice(0, 500));
      return NextResponse.json(
        { error: 'Overpass API falló o está rate-limiteada. Probá de nuevo en unos segundos.' },
        { status: 502 }
      );
    }

    const overpassData: { elements: OverpassElement[] } = await overpassRes.json();

    // Filtrar por el polígono real (Overpass solo filtró por bbox, que es más ancho)
    const candidatos = overpassData.elements
      .map((el) => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (lat === undefined || lon === undefined || !el.tags) return null;
        const nombre = nombreDeNegocio(el.tags);
        if (!nombre) return null; // descartamos elementos sin nombre, no sirven como lead
        return {
          osm_id: `${el.type}/${el.id}`,
          nombre,
          rubro: rubroDeNegocio(el.tags),
          direccion: direccionDeNegocio(el.tags),
          lat,
          lng: lon,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .filter((x) => turf.booleanPointInPolygon(turf.point([x.lng, x.lat]), feature));

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

    // Dedup fino: Overpass a veces devuelve el mismo comercio dos veces (un
    // node y un way para el mismo lugar), y volver a buscar sobre una zona
    // superpuesta puede traer una entidad nueva de OSM para un negocio que
    // ya habíamos guardado antes. El unique(fuente, osm_id) de la tabla solo
    // frena duplicados exactos por ID — acá comparamos por proximidad +
    // similitud de nombre para agarrar el resto.
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

    // Upsert por (fuente, osm_id) para no duplicar si volvés a buscar la misma zona
    const { data: negociosInsertados, error: insertError } = await supabase
      .from('negocios')
      .upsert(
        candidatosUnicos.map((c) => ({
          zona_id: zonaId,
          nombre: c.nombre,
          direccion: c.direccion,
          rubro: c.rubro,
          lat: c.lat,
          lng: c.lng,
          fuente: 'osm' as const,
          osm_id: c.osm_id,
        })),
        { onConflict: 'fuente,osm_id', ignoreDuplicates: false }
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
