-- Signup público habilitado (ver /signup), pero gateado: una cuenta nueva
-- no puede usar la app hasta que el equipo la apruebe a mano. La aprobación
-- se hace tildando la columna "approved" de esta tabla desde el Table
-- Editor de Supabase (dashboard) — no hay pantalla de aprobación en la app
-- a propósito, es una decisión de scope, no un olvido.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario puede leer su propia fila (no editarla) — el proxy de la app
-- necesita esto para poder chequear el estado de aprobación con la sesión
-- del usuario (anon key), sin depender de la service_role key.
create policy "select_own_profile" on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Crea la fila de profile (approved=false) automáticamente cuando alguien
-- se registra. security definer porque el usuario nuevo todavía no tiene
-- ningún permiso propio para insertar en profiles.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, approved)
  values (new.id, new.email, false);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: los usuarios creados a mano antes de este cambio quedan
-- aprobados de entrada, para que nadie pierda acceso con este deploy.
insert into public.profiles (id, email, approved)
select id, email, true
from auth.users
on conflict (id) do nothing;

-- Helper para las policies de las tablas de datos.
create function public.is_approved()
returns boolean
language sql
stable
as $$
  select coalesce((select approved from public.profiles where id = auth.uid()), false);
$$;

-- Las policies de 0002 dejaban pasar a cualquier "authenticated" sin
-- distinción — alguien recién registrado (sin aprobar) podía pegarle
-- directo a la REST API con la anon key (pública) y leer/escribir todo, sin
-- pasar por el proxy de la app. Ahora también exigen estar aprobado.
drop policy "authenticated_all_zonas" on zonas;
create policy "authenticated_all_zonas" on zonas
  for all
  to authenticated
  using (public.is_approved())
  with check (public.is_approved());

drop policy "authenticated_all_negocios" on negocios;
create policy "authenticated_all_negocios" on negocios
  for all
  to authenticated
  using (public.is_approved())
  with check (public.is_approved());

drop policy "authenticated_all_leads" on leads;
create policy "authenticated_all_leads" on leads
  for all
  to authenticated
  using (public.is_approved())
  with check (public.is_approved());

drop policy "authenticated_all_interacciones" on interacciones;
create policy "authenticated_all_interacciones" on interacciones
  for all
  to authenticated
  using (public.is_approved())
  with check (public.is_approved());
