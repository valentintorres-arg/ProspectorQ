import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentMembership, getUser } from '@/lib/supabase/auth-server';

// POST /api/orgs/invitations  { email } -> invita ese email a la org activa.
// Solo owner/admin. No manda mail (ver comentario en la migración 0007):
// la invitación queda pendiente hasta que esa persona entra a la app.
export async function POST(req: NextRequest) {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'No tenés permiso para invitar' }, { status: 403 });
    }

    const user = await getUser();
    const body = await req.json();
    const email: string = (body.email ?? '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }
    if (email === user?.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Ese sos vos' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (existingProfile) {
      const { data: existingMembership } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('org_id', membership.orgId)
        .eq('user_id', existingProfile.id)
        .maybeSingle();

      if (existingMembership) {
        return NextResponse.json({ error: 'Ya es miembro de esta organización' }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from('invitations')
      .insert({ org_id: membership.orgId, email, invited_by: user!.id })
      .select('id, email, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya hay una invitación pendiente para ese email' }, { status: 409 });
      }
      console.error(error);
      return NextResponse.json({ error: 'No se pudo crear la invitación' }, { status: 500 });
    }

    return NextResponse.json({ invitation: data }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado creando la invitación' }, { status: 500 });
  }
}

// GET /api/orgs/invitations -> invitaciones pendientes dirigidas al email
// del usuario logueado (para la sección "Invitaciones recibidas").
export async function GET() {
  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('invitations')
      .select('id, email, created_at, org_id, organizations(nombre)')
      .ilike('email', user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudieron leer las invitaciones' }, { status: 500 });
    }

    const invitations = (data ?? []).map((i) => ({
      id: i.id,
      email: i.email,
      createdAt: i.created_at,
      orgId: i.org_id,
      orgNombre: (i.organizations as unknown as { nombre: string } | null)?.nombre ?? '',
    }));

    return NextResponse.json({ invitations });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado leyendo las invitaciones' }, { status: 500 });
  }
}
