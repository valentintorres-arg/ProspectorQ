-- Fuente de datos adicional: Overture Maps (self-hosted vía S3 público, sin
-- costo por consulta, a diferencia de Google Places). Reemplaza a Overpass
-- como fuente principal de búsqueda de zona por mejor cobertura de
-- teléfono/web/dirección (ver comparación en app/api/search-zone/route.ts).
alter table negocios drop constraint if exists negocios_fuente_check;
alter table negocios add constraint negocios_fuente_check
  check (fuente in ('osm', 'google', 'overture'));

alter table negocios add column if not exists overture_id text;
alter table negocios add column if not exists ultima_actualizacion timestamptz;

-- evita duplicados exactos del mismo origen al re-buscar una zona superpuesta
alter table negocios add constraint negocios_fuente_overture_id_key unique (fuente, overture_id);

comment on column negocios.ultima_actualizacion is
  'Fecha del dato fuente más reciente (ej. sources[].update_time de Overture), no la fecha en que lo insertamos nosotros. Sirve para detectar negocios potencialmente cerrados: si nadie verificó el dato hace mucho, desconfiar.';
