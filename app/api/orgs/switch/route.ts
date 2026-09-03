import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ACTIVE_ORG_COOKIE, getUserMemberships } from '@/lib/supabase/auth-server';

// POST /api/orgs/switch  { orgId } -> cambia la org activa de esta sesión
// (cookie). 403 si el usuario no es miembro de esa org.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId: string = body.orgId;

    if (!orgId) {
      return NextResponse.json({ error: 'Falta orgId' }, { status: 400 });
    }

    const memberships = await getUserMemberships();
    if (!memberships.some((m) => m.orgId === orgId)) {
      return NextResponse.json({ error: 'No pertenecés a esa organización' }, { status: 403 });
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado cambiando de organización' }, { status: 500 });
  }
}
