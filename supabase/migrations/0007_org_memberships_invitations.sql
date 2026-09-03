-- Multi-org membership: un usuario puede pertenecer a varias organizaciones,
-- y una organización puede tener varios usuarios, con roles. Reemplaza el
-- profiles.org_id 1:1 de 0006 por una tabla de membership many-to-many, y
-- agrega invitaciones in-app para sumar gente a una org (sin envío de mail:
-- ver comentario en la migración anterior sobre el mismo patrón manual de
-- profiles.approved — acá la invitación queda pendiente hasta que la
-- persona invitada entra a la app con esa cuenta).

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (user_id, org_id)
);

alter table public.memberships enable row level security;

-- Backfill: cada profile existente pasa a ser owner de su única org (no hay
-- forma de saber si "debería" ser admin/member, y owner es la opción que no
-- le saca ninguna capacidad a nadie que ya la tenía).
insert into public.memberships (user_id, org_id, role)
select id, org_id, 'owner' from public.profiles;

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

alter table public.invitations enable row level security;

-- security definer: si una policy de memberships consultara memberships sin
-- esto, entraría en recursión infinita (la subquery re-dispara la misma
-- policy). Mismo patrón que is_approved()/handle_new_user() en 0005.
create or replace function public.is_org_member(check_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.org_id = check_org_id
  );
$$;

create or replace function public.org_role(check_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.memberships
  where user_id = auth.uid() and org_id = check_org_id;
$$;

revoke execute on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated, service_role;
revoke execute on function public.org_role(uuid) from public;
grant execute on function public.org_role(uuid) to authenticated, service_role;

-- memberships: cualquier miembro de la org ve a sus compañeros. Borrar: un
-- admin/owner puede sacar a un member; sacar a un admin requiere ser owner;
-- nada permite tocar la fila del owner. Cambiar rol: solo el owner, y ni la
-- fila vieja ni la nueva pueden ser 'owner' (no se puede promover a owner
-- ni degradarlo).
create policy "select_org_memberships" on memberships
  for select
  to authenticated
  using (public.is_org_member(org_id));

create policy "delete_memberships_as_admin" on memberships
  for delete
  to authenticated
  using (
    (public.org_role(org_id) in ('owner', 'admin') and role = 'member')
    or (public.org_role(org_id) = 'owner' and role = 'admin')
  );

create policy "update_membership_role_as_owner" on memberships
  for update
  to authenticated
  using (public.org_role(org_id) = 'owner' and role <> 'owner')
  with check (public.org_role(org_id) = 'owner' and role <> 'owner');

-- invitations: tu org ve las que mandó (para gestionarlas), vos ves las que
-- te llegaron a tu email. Solo owner/admin puede crear o revocar; rechazar
-- la propia invitación no requiere rol.
create policy "select_invitations" on invitations
  for select
  to authenticated
  using (
    public.is_org_member(org_id)
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "insert_invitations_as_admin" on invitations
  for insert
  to authenticated
  with check (invited_by = auth.uid() and public.org_role(org_id) in ('owner', 'admin'));

create policy "delete_invitations" on invitations
  for delete
  to authenticated
  using (
    public.org_role(org_id) in ('owner', 'admin')
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- organizations: la policy de 0006 leía profiles.org_id. Hay que reemplazarla
-- ANTES de poder dropear esa columna (la policy vieja depende de ella).
drop policy "select_own_organization" on organizations;
create policy "select_org_members" on organizations
  for select
  to authenticated
  using (public.is_org_member(id));

alter table public.profiles drop column org_id;

-- leads/interacciones: current_org_id() asumía una sola org por usuario.
-- is_org_member() reemplaza esa noción por "sos miembro de ESA fila".
drop policy "authenticated_all_leads" on leads;
create policy "authenticated_all_leads" on leads
  for all
  to authenticated
  using (public.is_approved() and public.is_org_member(org_id))
  with check (public.is_approved() and public.is_org_member(org_id));

drop policy "authenticated_all_interacciones" on interacciones;
create policy "authenticated_all_interacciones" on interacciones
  for all
  to authenticated
  using (public.is_approved() and public.is_org_member(org_id))
  with check (public.is_approved() and public.is_org_member(org_id));

drop function public.current_org_id();

-- handle_new_user: sigue creando la org nueva, pero ahora la vincula vía
-- memberships (role='owner') en vez de profiles.org_id.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  insert into public.organizations (nombre)
  values (split_part(new.email, '@', 1))
  returning id into v_org_id;

  insert into public.profiles (id, email, approved)
  values (new.id, new.email, false);

  insert into public.memberships (user_id, org_id, role)
  values (new.id, v_org_id, 'owner');

  return new;
end;
$$;
