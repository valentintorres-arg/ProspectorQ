'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Negocio } from '@/lib/types';

interface MapCanvasProps {
  onZoneDrawn: (polygon: GeoJSON.Polygon) => void;
  resultados: Negocio[];
  buscando: boolean;
  // Zona ya guardada que hay que dibujar apenas el mapa esté listo (ej. al
  // volver a buscar desde /zonas). No dispara onZoneDrawn: eso lo maneja
  // la página que la pasó.
  initialPolygon?: GeoJSON.Polygon | null;
}

// Convierte un L.Polygon dibujado a un GeoJSON Polygon en [lng, lat]
// (GeoJSON siempre va lng,lat — al revés de como Leaflet entrega lat/lng).
function polygonToGeoJSON(latlngs: L.LatLng[]): GeoJSON.Polygon {
  const coords: [number, number][] = latlngs.map((p) => [p.lng, p.lat]);
  if (coords.length > 0) {
    const [firstLng, firstLat] = coords[0];
    const [lastLng, lastLat] = coords[coords.length - 1];
    if (firstLng !== lastLng || firstLat !== lastLat) {
      coords.push(coords[0]);
    }
  }
  return { type: 'Polygon', coordinates: [coords] };
}

function geoJSONToLatLngs(polygon: GeoJSON.Polygon): L.LatLng[] {
  return polygon.coordinates[0].map(([lng, lat]) => L.latLng(lat, lng));
}

export default function MapCanvas({ onZoneDrawn, resultados, buscando, initialPolygon }: MapCanvasProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const draftPolygonRef = useRef<L.Polygon | null>(null);
  const finalPolygonRef = useRef<L.Polygon | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const initialDrawnRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [dibujando, setDibujando] = useState(false);
  const [puntos, setPuntos] = useState(0);

  // Inicialización del mapa (una sola vez).
  // Usa Leaflet + tiles de OpenStreetMap: 100% gratis, sin API key.
  // El dibujo del polígono se hace a mano: click agrega vértices sobre un
  // L.Polygon, y un botón cierra la zona y dispara la búsqueda.
  useEffect(() => {
    if (!mapDivRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [-34.6037, -58.3816], // Buenos Aires. Ajustá si tu zona de trabajo es otra.
      zoom: 12,
    });

    // Esri "Light Gray Canvas": gratis, sin API key, estilo minimalista
    // (grises + agua celeste) — más legible que OSM para mirar markers.
    // Nota: se probó CartoDB Positron primero pero ahora exige API key
    // incluso en su tier "gratuito", por eso Esri en su lugar.
    const attribution =
      'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { attribution, maxZoom: 16 }
    ).addTo(map);
    // Capa de referencia (nombres de calles/barrios): se agrega después,
    // así queda arriba del canvas gris dentro del mismo tilePane.
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      { attribution, maxZoom: 16 }
    ).addTo(map);

    mapRef.current = map;
    setReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  function limpiarDibujoActual() {
    if (draftPolygonRef.current) {
      draftPolygonRef.current.remove();
      draftPolygonRef.current = null;
    }
    setPuntos(0);
  }

  function iniciarDibujo() {
    const map = mapRef.current;
    if (!map) return;

    // Solo una zona activa a la vez
    if (finalPolygonRef.current) {
      finalPolygonRef.current.remove();
      finalPolygonRef.current = null;
    }
    limpiarDibujoActual();

    const draft = L.polygon([], {
      color: '#2563eb',
      weight: 2,
      fillColor: '#2563eb',
      fillOpacity: 0.15,
    }).addTo(map);
    draftPolygonRef.current = draft;

    map.on('click', onMapClickDuringDraw);
    setDibujando(true);
  }

  function onMapClickDuringDraw(e: L.LeafletMouseEvent) {
    const draft = draftPolygonRef.current;
    if (!draft) return;
    const latlngs = [...(draft.getLatLngs()[0] as L.LatLng[]), e.latlng];
    draft.setLatLngs(latlngs);
    setPuntos(latlngs.length);
  }

  function cerrarZona() {
    const draft = draftPolygonRef.current;
    const map = mapRef.current;
    if (!draft || !map) return;
    const latlngs = draft.getLatLngs()[0] as L.LatLng[];
    if (latlngs.length < 3) return;

    map.off('click', onMapClickDuringDraw);

    draft.setStyle({ fillOpacity: 0.1 });
    finalPolygonRef.current = draft;
    draftPolygonRef.current = null;
    setDibujando(false);
    setPuntos(0);

    onZoneDrawn(polygonToGeoJSON(latlngs));
  }

  function cancelarDibujo() {
    mapRef.current?.off('click', onMapClickDuringDraw);
    limpiarDibujoActual();
    setDibujando(false);
  }

  // Dibuja una zona ya guardada (pasada por prop) una sola vez, apenas el
  // mapa está listo, y centra la vista sobre ella.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !initialPolygon || initialDrawnRef.current) return;
    initialDrawnRef.current = true;

    const polygon = L.polygon(geoJSONToLatLngs(initialPolygon), {
      color: '#2563eb',
      weight: 2,
      fillColor: '#2563eb',
      fillOpacity: 0.1,
    }).addTo(map);
    finalPolygonRef.current = polygon;
    map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
  }, [ready, initialPolygon]);

  // Pintar los resultados como markers cada vez que cambian
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    resultados.forEach((negocio) => {
      const marker = L.circleMarker([negocio.lat, negocio.lng], {
        radius: 6,
        color: '#ffffff',
        weight: 1,
        fillColor: negocio.enriquecido ? '#16a34a' : '#f59e0b',
        fillOpacity: 1,
      })
        .bindTooltip(negocio.nombre)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [resultados]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapDivRef} className="h-full w-full rounded-lg border border-gray-200" />

      {!ready && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-white/60 text-sm text-gray-500">
          Cargando mapa…
        </div>
      )}

      {ready && (
        <div className="absolute left-1/2 top-4 z-[1000] flex max-w-[92%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full bg-white px-3 py-1.5 shadow">
          {!dibujando ? (
            <button
              onClick={iniciarDibujo}
              className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Dibujar zona
            </button>
          ) : (
            <>
              <span className="text-xs text-gray-600">
                {puntos < 3 ? `Marcá al menos 3 puntos (${puntos})` : `${puntos} puntos`}
              </span>
              <button
                onClick={cerrarZona}
                disabled={puntos < 3}
                className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Cerrar zona
              </button>
              <button
                onClick={cancelarDibujo}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium hover:bg-gray-200"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      )}

      {buscando && (
        <div className="absolute left-1/2 top-16 z-[1000] -translate-x-1/2 rounded-full bg-white px-4 py-1.5 text-sm shadow">
          Buscando negocios en la zona…
        </div>
      )}
    </div>
  );
}
