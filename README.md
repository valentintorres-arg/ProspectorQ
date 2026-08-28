# Prospector

Sistema de prospección de negocios por zona para valtinq: dibujás un
polígono sobre un mapa de Google, busca los negocios que caen adentro
(OpenStreetMap gratis) y te deja enriquecerlos con Google Places y meterlos
a un pipeline de ventas.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind
- Supabase (Postgres + PostGIS) — todo serverless
- Leaflet + tiles de OpenStreetMap (mapa + dibujo manual de polígono, ver nota abajo) — gratis, sin API key
- Overpass API (OpenStreetMap) para el barrido inicial de negocios — gratis
- Google Places API (New) — solo para enriquecer los negocios que te interesan

## Cómo se dibuja la zona

Leaflet no trae una herramienta de dibujo de polígonos por defecto, así que
está hecho a mano: botón "Dibujar zona" → click en el mapa agrega vértices →
botón "Cerrar zona" arma el polígono. Ver `components/MapCanvas.tsx`.

## Setup

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En el SQL Editor, corré el contenido de `supabase/migrations/0001_init.sql`
   (esto habilita PostGIS y crea las tablas `zonas`, `negocios`, `leads`,
   `interacciones`).
3. Copiá `Project URL`, `anon public key` y `service_role key` desde
   Project Settings → API.

### 2. Google Places API (opcional, solo para enriquecer negocios)

El mapa en sí (Leaflet + OpenStreetMap) no necesita ninguna key. Esto es solo
si querés el botón "Enriquecer con Google" que completa teléfono/web/rating.

1. Creá un proyecto en [Google Cloud Console](https://console.cloud.google.com)
   y habilitá billing (necesario aunque uses solo el tier gratuito).
2. Habilitá **Places API (New)**.
3. Creá una API key sin restricción de referrer (no aplica en server),
   limitada por API a solo Places API.
4. Tier gratis actual (verificar en la consola, cambia con el tiempo):
   ~5.000 requests de Places Text Search/mes gratis. Para uso interno alcanza
   sobrado.

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completá las 4 variables con los valores de los pasos anteriores
(`GOOGLE_MAPS_SERVER_API_KEY` puede quedar vacía si no vas a enriquecer).

### 4. Correr en local

```bash
pnpm install
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Flujo de uso

1. `/mapa`: click en "Dibujar zona", marcá los vértices del área que te
   interesa, "Cerrar zona". Busca automáticamente en Overpass y muestra los
   negocios encontrados en el panel lateral y como marcadores.
2. Por cada negocio, "Enriquecer con Google" pega a Places API y completa
   teléfono/web/rating (usalo solo en los que te interesan, no en todos, para
   cuidar la cuota gratis).
3. "Agregar a pipeline" crea el lead en etapa "Identificado".
4. `/pipeline`: vista por etapas, cambiás la etapa de cada lead desde ahí.

## Qué falta para producción

Esto es un MVP funcional, no un producto terminado. Antes de usarlo con
clientes reales o exponerlo públicamente, conviene sumar:

- Auth (Supabase Auth) — hoy cualquiera con la URL puede usar la app.
- RLS (Row Level Security) en las tablas de Supabase — hoy el acceso es
  todo vía service_role key sin restricciones a nivel fila.
- Rate limiting propio en `/api/search-zone` para no pegarle a Overpass sin
  control (Overpass público es compartido y te puede banear temporalmente si
  abusás).
- Manejo de duplicados más fino (hoy dedupea por `osm_id`/`google_place_id`
  exactos, no por proximidad/nombre similar entre fuentes distintas).
- Página de detalle de lead (`/leads/[id]`) con historial de interacciones
  — la tabla `interacciones` ya existe en el schema pero no tiene UI todavía.
