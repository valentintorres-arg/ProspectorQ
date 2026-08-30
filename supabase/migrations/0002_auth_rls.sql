-- Habilita RLS en todas las tablas. La app es de un solo equipo (sin
-- multi-tenancy: no hay owner por fila), así que la política es simple:
-- solo usuarios autenticados pueden leer/escribir. Las API routes usan la
-- service_role key (bypassa RLS) para el trabajo pesado, pero esto protege
-- por si alguna vez se usa la anon key directo desde el browser (ej. una
-- futura suscripción realtime) y evita que un visitante no logueado lea
-- datos vía la REST API expuesta con la anon key.

alter table zonas enable row level security;
alter table negocios enable row level security;
alter table leads enable row level security;
alter table interacciones enable row level security;

create policy "authenticated_all_zonas" on zonas
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_negocios" on negocios
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_leads" on leads
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_all_interacciones" on interacciones
  for all
  to authenticated
  using (true)
  with check (true);

-- insert_zona es SECURITY DEFINER (corre con privilegios del dueño de la
-- función, no del caller) así que RLS no la frena por sí sola: hay que
-- restringir explícitamente quién puede ejecutarla.
revoke execute on function insert_zona(text, text) from public;
grant execute on function insert_zona(text, text) to authenticated, service_role;
