-- Habilitar PostGIS para manejar geometrías (polígonos de zona, puntos de negocios)
create extension if not exists postgis;

-- Zonas dibujadas en el mapa
create table if not exists zonas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default 'Zona sin nombre',
  geom geometry(Polygon, 4326) not null,
  created_at timestamptz not null default now()
);

-- Negocios encontrados (por OSM/Overpass y/o Google Places)
create table if not exists negocios (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid references zonas(id) on delete set null,
  nombre text not null,
  direccion text,
  rubro text,
  telefono text,
  web text,
  lat double precision not null,
  lng double precision not null,
  geom geometry(Point, 4326) generated always as (
    st_setsrid(st_makepoint(lng, lat), 4326)
  ) stored,
  fuente text not null check (fuente in ('osm', 'google')),
  osm_id text,
  google_place_id text,
  rating numeric,
  enriquecido boolean not null default false,
  created_at timestamptz not null default now(),
  -- evita duplicados exactos del mismo origen
  unique (fuente, osm_id),
  unique (fuente, google_place_id)
);

create index if not exists negocios_geom_idx on negocios using gist (geom);
create index if not exists negocios_zona_idx on negocios (zona_id);

-- Pipeline de prospección: un lead = un negocio que decidiste trabajar
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  etapa text not null default 'identificado'
    check (etapa in ('identificado', 'contactado', 'en_conversacion', 'propuesta', 'ganado', 'perdido')),
  proxima_accion text,
  proxima_accion_fecha date,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (negocio_id)
);

create index if not exists leads_etapa_idx on leads (etapa);

-- Historial de interacciones con un lead (llamadas, mails, reuniones)
create table if not exists interacciones (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  tipo text not null default 'nota' check (tipo in ('nota', 'llamada', 'mail', 'reunion', 'whatsapp')),
  descripcion text not null,
  created_at timestamptz not null default now()
);

create index if not exists interacciones_lead_idx on interacciones (lead_id);

-- Trigger para mantener updated_at al día en leads
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at
  before update on leads
  for each row
  execute function set_updated_at();

-- Helper RPC: insertar una zona a partir de un GeoJSON (string) de polígono.
-- Se usa desde la API de Next.js porque supabase-js no convierte GeoJSON a
-- geometry PostGIS automáticamente en un insert directo.
create or replace function insert_zona(p_nombre text, p_geojson text)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into zonas (nombre, geom)
  values (p_nombre, st_setsrid(st_geomfromgeojson(p_geojson), 4326))
  returning id into v_id;
  return v_id;
end;
$$;
