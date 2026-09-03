-- Centro de notificaciones: actividad sobre leads (crear, cambiar etapa,
-- editar, agregar interacción, eliminar) hecha por cualquiera en tu org, más
-- "alguien se sumó a tu organización". Leads vencidos e invitaciones
-- recibidas NO se guardan acá — se calculan al vuelo en GET /api/notifications
-- (no son "eventos" que alguien disparó, son estado derivado).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  tipo text not null check (tipo in (
    'lead_creado',
    'lead_etapa_cambiada',
    'lead_actualizado',
    'lead_eliminado',
    'interaccion_agregada',
    'miembro_sumado'
  )),
  lead_id uuid references public.leads(id) on delete set null,
  detalle jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index notifications_org_created_idx on public.notifications (org_id, created_at desc);

alter table public.notifications enable row level security;

-- Solo lectura para miembros de la org. Sin policy de insert/update/delete
-- para "authenticated": las notificaciones las crea siempre el service role
-- desde las API routes (necesitan saber quién es el actor de la request,
-- que la service key no trae) — nadie debería poder fabricarlas directo con
-- la anon key.
create policy "select_org_notifications" on notifications
  for select
  to authenticated
  using (public.is_org_member(org_id));

-- Por-usuario-por-org: cuándo fue la última vez que abriste la campanita
-- estando en esa organización. default now() para que una membership nueva
-- (incluida la que se crea al aceptar una invitación) no arranque con todo
-- el historial previo marcado como "no leído".
alter table public.memberships
  add column notifications_last_seen_at timestamptz not null default now();
