-- Zonas por organización: hasta acá zonas era catálogo compartido (igual
-- que negocios, ver 0006). Ahora cada zona tiene una org dueña — al cambiar
-- de organización activa, solo ves las zonas que esa org buscó. negocios
-- sigue compartido a propósito (evita duplicar llamadas a Overpass/Overture/
-- Google entre orgs que buscan zonas superpuestas).

alter table public.zonas add column org_id uuid references public.organizations(id);

-- Backfill: las zonas que ya existen quedan bajo la misma org "legacy" que
-- 0006 le asignó a los leads preexistentes (mismo criterio: nada queda
-- huérfano/oculto para el equipo que ya las tenía).
update public.zonas
set org_id = (select id from public.organizations where nombre = 'Equipo original')
where org_id is null;

alter table public.zonas alter column org_id set not null;

drop policy "authenticated_all_zonas" on zonas;
create policy "authenticated_all_zonas" on zonas
  for all
  to authenticated
  using (public.is_approved() and public.is_org_member(org_id))
  with check (public.is_approved() and public.is_org_member(org_id));

-- insert_zona necesita el org_id para poder taguear la zona nueva. Se
-- dropea la firma vieja (2 argumentos) y se crea la de 3.
drop function public.insert_zona(text, text);

create function public.insert_zona(p_nombre text, p_geojson text, p_org_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into zonas (nombre, geom, org_id)
  values (p_nombre, st_setsrid(st_geomfromgeojson(p_geojson), 4326), p_org_id)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.insert_zona(text, text, uuid) from public;
grant execute on function public.insert_zona(text, text, uuid) to authenticated, service_role;
