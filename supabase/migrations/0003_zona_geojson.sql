-- RPC para recuperar el polígono de una zona ya guardada como GeoJSON, así
-- la UI puede "volver a buscar" sobre una zona sin que el usuario la
-- redibuje. No es SECURITY DEFINER a propósito: corre con los privilegios
-- del caller, así que RLS de "zonas" se sigue aplicando normalmente.
create or replace function zona_geojson(p_id uuid)
returns text
language sql
stable
as $$
  select st_asgeojson(geom) from zonas where id = p_id;
$$;

revoke execute on function zona_geojson(uuid) from public;
grant execute on function zona_geojson(uuid) to authenticated, service_role;
