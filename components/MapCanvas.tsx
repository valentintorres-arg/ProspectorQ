'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
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
  const { t } = useLanguage();
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
  // Usa Leaflet + tiles de OpenStreetMap: 100% gratis, sin API key ni cuenta.
  // El dibujo del polígono se hace a mano: click agrega vértices sobre un
  // L.Polygon, y un botón cierra la zona y dispara la búsqueda.
  useEffect(() => {
    if (!mapDivRef.current) return;

    const map = L.map(mapDivRef.current, {
      center: [-34.6037, -58.3816], // Buenos Aires. Ajustá si tu zona de trabajo es otra.
      zoom: 12,
      maxZoom: 19,
      zoomControl: false, // se reemplaza por los botones +/- propios (estética del design system)
    });

    // Se probaron, en orden: Esri Light Gray Canvas (gratis, sin key, pero
    // tiles nativos solo hasta z16 -> se veía pixelado forzando más zoom) y
    // OpenFreeMap/CartoDB Positron vectorial (nítido a cualquier zoom, pero
    // requiere WebGL vía MapLibre GL -> pantalla en blanco en máquinas sin
    // aceleración de GPU real, confirmado tanto en este entorno como en el
    // browser real). Tiles rasters de OSM: el único que es gratis, sin
    // cuenta Y no depende de WebGL. Atribución visible a propósito: la
    // licencia ODbL de OSM la exige, a diferencia de Esri/Carto donde se
    // ocultaba "a pedido".
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

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
      color: '#674bb5',
      weight: 2,
      fillColor: '#674bb5',
      fillOpacity: 0.15,
    }).addTo(map);
    draftPolygonRef.current = draft;

    // Leaflet maneja el cursor con sus propias clases (leaflet-grab, etc.),
    // así que una clase de Tailwind en el div contenedor no alcanza a
    // pisarlas — se fuerza por inline style directo sobre el container.
    map.getContainer().style.cursor = 'crosshair';

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
    map.getContainer().style.cursor = '';

    draft.setStyle({ fillOpacity: 0.1 });
    finalPolygonRef.current = draft;
    draftPolygonRef.current = null;
    setDibujando(false);
    setPuntos(0);

    onZoneDrawn(polygonToGeoJSON(latlngs));
  }

  function cancelarDibujo() {
    mapRef.current?.off('click', onMapClickDuringDraw);
    if (mapRef.current) mapRef.current.getContainer().style.cursor = '';
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
      color: '#674bb5',
      weight: 2,
      fillColor: '#674bb5',
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
        fillColor: negocio.enriquecido ? '#006c4b' : '#855316',
        fillOpacity: 1,
      })
        .bindTooltip(negocio.nombre)
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [resultados]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapDivRef} className="h-full w-full rounded-xl border border-outline-variant/20" />

      {!ready && (
        <div className="absolute inset-0 z-[1000] animate-pulse rounded-xl bg-surface-container-highest" />
      )}

      {ready && (
        <>
          <div className="absolute left-6 top-6 z-[1000] flex flex-col gap-2">
            <button
              onClick={() => mapRef.current?.zoomIn()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/10 bg-surface text-on-surface shadow-sm hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
            <button
              onClick={() => mapRef.current?.zoomOut()}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-outline-variant/10 bg-surface text-on-surface shadow-sm hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined">remove</span>
            </button>
          </div>

          <div className="absolute left-1/2 top-4 z-[1000] flex max-w-[92%] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-full border border-outline-variant/10 bg-surface px-3 py-1.5 shadow-sm">
            {!dibujando ? (
              <button
                onClick={iniciarDibujo}
                className="font-label flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-on-primary hover:opacity-90"
              >
                <span className="material-symbols-outlined text-[16px]">draw</span>
                {t.mapCanvas.drawZone}
              </button>
            ) : (
              <>
                <span className="font-label text-xs text-on-surface-variant">
                  {puntos < 3 ? t.mapCanvas.markAtLeast(puntos) : t.mapCanvas.pointsCount(puntos)}
                </span>
                <button
                  onClick={cerrarZona}
                  disabled={puntos < 3}
                  className="font-label rounded-full bg-primary px-3 py-1 text-xs font-medium text-on-primary hover:opacity-90 disabled:opacity-40"
                >
                  {t.mapCanvas.closeZone}
                </button>
                <button
                  onClick={cancelarDibujo}
                  className="font-label rounded-full bg-surface-container-highest px-3 py-1 text-xs font-medium text-on-surface-variant hover:opacity-80"
                >
                  {t.mapCanvas.cancel}
                </button>
              </>
            )}
          </div>
        </>
      )}

      {buscando && (
        <div className="absolute left-1/2 top-16 z-[1000] -translate-x-1/2 rounded-full border border-outline-variant/10 bg-surface px-4 py-1.5 text-sm text-on-surface-variant shadow-sm">
          {t.mapCanvas.searching}
        </div>
      )}
    </div>
  );
}
