import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { Negocio } from '@/lib/types';

// Usa la Places API (New) - Text Search, que reemplaza a la legacy Find Place.
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
}

async function buscarEnGooglePlaces(negocio: Negocio, apiKey: string): Promise<PlaceResult | null> {
  const query = negocio.direccion ? `${negocio.nombre} ${negocio.direccion}` : negocio.nombre;

  const res = await fetch(PLACES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      // Field mask acotado: solo pedimos lo que vamos a guardar, así el
      // request cae en el SKU más barato posible.
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating',
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: negocio.lat, longitude: negocio.lng },
          radius: 200.0,
        },
      },
      maxResultCount: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Places API error:', res.status, text.slice(0, 500));
    return null;
  }

  const data: { places?: PlaceResult[] } = await res.json();
  return data.places?.[0] ?? null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Falta GOOGLE_MAPS_SERVER_API_KEY en el servidor (ver README)' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const negocioIds: string[] = body.negocioIds;

    if (!Array.isArray(negocioIds) || negocioIds.length === 0) {
      return NextResponse.json({ error: 'Falta negocioIds (array)' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: negocios, error: fetchError } = await supabase
      .from('negocios')
      .select('*')
      .in('id', negocioIds);

    if (fetchError || !negocios) {
      console.error(fetchError);
      return NextResponse.json({ error: 'No se pudieron leer los negocios' }, { status: 500 });
    }

    const actualizados: Negocio[] = [];

    // Secuencial a propósito: son pocos negocios por batch (los que el
    // usuario eligió enriquecer, no el barrido completo) y evita ráfagas
    // que puedan pegar contra rate limits de la API.
    for (const negocio of negocios) {
      const place = await buscarEnGooglePlaces(negocio, apiKey);
      if (!place) continue;

      const { data: updated, error: updateError } = await supabase
        .from('negocios')
        .update({
          telefono: place.nationalPhoneNumber ?? negocio.telefono,
          web: place.websiteUri ?? negocio.web,
          direccion: place.formattedAddress ?? negocio.direccion,
          rating: place.rating ?? negocio.rating,
          google_place_id: place.id,
          enriquecido: true,
        })
        .eq('id', negocio.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error actualizando negocio', negocio.id, updateError);
        continue;
      }
      actualizados.push(updated);
    }

    return NextResponse.json({ actualizados });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado enriqueciendo negocios' }, { status: 500 });
  }
}
