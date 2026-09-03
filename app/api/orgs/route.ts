import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { ACTIVE_ORG_COOKIE, getCurrentOrgId, getUser, getUserMemberships } from '@/lib/supabase/auth-server';

// GET /api/orgs -> organizaciones del usuario logueado (con su rol en cada
// una) + cuál está activa, para el selector de org del sidebar.
export async function GET() {
  try {
    const [orgs, activeOrgId] = await Promise.all([getUserMemberships(), getCurrentOrgId()]);
    return NextResponse.json({ orgs, activeOrgId });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'No se pudieron leer las organizaciones' }, { status: 500 });
  }
}

// POST /api/orgs  { nombre } -> crea una organización nueva, te suma como
// owner, y la deja como org activa. Cualquier usuario logueado puede crear
// una (no hay límite de organizaciones por usuario ni de miembros - no se
// pidió ninguno).
export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const nombre: string = (body.nombre ?? '').trim();
    if (!nombre) {
      return NextResponse.json({ error: 'Falta el nombre de la organización' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ nombre })
      .select('id, nombre')
      .single();

    if (orgError) {
      console.error(orgError);
      return NextResponse.json({ error: 'No se pudo crear la organización' }, { status: 500 });
    }

    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({ user_id: user.id, org_id: org.id, role: 'owner' });

    if (membershipError) {
      console.error(membershipError);
      return NextResponse.json({ error: 'No se pudo crear la organización' }, { status: 500 });
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, org.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ org }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado creando la organización' }, { status: 500 });
  }
}
