-- Multi-tenancy: aísla el pipeline (leads/interacciones) por organización.
-- zonas y negocios quedan como catálogo compartido a propósito (son datos
-- públicos de OSM/Overture/Google, y aislarlos por org duplicaría llamadas
-- a esas APIs sin ninguna ganancia de privacidad).

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

alter table public.profiles add column org_id uuid references public.organizations(id);
alter table public.leads add column org_id uuid references public.organizations(id);
alter table public.interacciones add column org_id uuid references public.organizations(id);

-- Backfill: los profiles/leads/interacciones creados antes de este cambio no
-- tienen owner. Se agrupan bajo una única org "legacy" para que el equipo
-- actual siga viendo exactamente lo que ve hoy (nada queda huérfano/oculto).
-- Los signups nuevos, después de este migration, arrancan con su propia org
-- aislada (ver handle_new_user más abajo).
do $$
declare
  v_legacy_org_id uuid;
begin
  if exists (select 1 from public.profiles where org_id is null)
     or exists (select 1 from public.leads where org_id is null)
  then
    insert into public.organizations (nombre) values ('Equipo original')
    returning id into v_legacy_org_id;

    update public.profiles set org_id = v_legacy_org_id where org_id is null;
    update public.leads set org_id = v_legacy_org_id where org_id is null;
    update public.interacciones set org_id = v_legacy_org_id where org_id is null;
  end if;
end $$;

alter table public.profiles alter column org_id set not null;
alter table public.leads alter column org_id set not null;
alter table public.interacciones alter column org_id set not null;

-- El unique(negocio_id) de 0001_init.sql asumía un solo pipeline compartido:
-- un negocio = un lead en todo el sistema. Ahora que negocios es un catálogo
-- compartido entre organizaciones, dos orgs distintas tienen que poder
-- convertir el mismo negocio en lead cada una por su lado.
alter table public.leads drop constraint leads_negocio_id_key;
alter table public.leads add constraint leads_org_id_negocio_id_key unique (org_id, negocio_id);

-- Cada usuario puede leer su propia organización (para mostrar su nombre en
-- la UI más adelante si hace falta).
create policy "select_own_organization" on public.organizations
  for select
  to authenticated
  using (id = (select org_id from public.profiles where id = auth.uid()));

-- Helper para las policies de leads/interacciones (mismo patrón que
-- is_approved() en 0005_profiles_approval.sql).
create or replace function public.current_org_id()
returns uuid
language sql
stable
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

-- handle_new_user ahora también crea una organización nueva para la cuenta
-- que se está registrando, y la vincula en profiles.org_id. Si el equipo
-- quiere agrupar dos cuentas en la misma org, lo hace a mano editando
-- profiles.org_id desde el dashboard (mismo patrón manual que approved).
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

  insert into public.profiles (id, email, approved, org_id)
  values (new.id, new.email, false, v_org_id);

  return new;
end;
$$;

-- Las policies de leads/interacciones (0002/0005) dejaban pasar a cualquier
-- usuario aprobado sin distinguir organización. Ahora también exigen que la
-- fila sea de la org del usuario.
drop policy "authenticated_all_leads" on leads;
create policy "authenticated_all_leads" on leads
  for all
  to authenticated
  using (public.is_approved() and org_id = public.current_org_id())
  with check (public.is_approved() and org_id = public.current_org_id());

drop policy "authenticated_all_interacciones" on interacciones;
create policy "authenticated_all_interacciones" on interacciones
  for all
  to authenticated
  using (public.is_approved() and org_id = public.current_org_id())
  with check (public.is_approved() and org_id = public.current_org_id());
