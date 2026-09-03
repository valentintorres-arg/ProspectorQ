import { NextResponse } from 'next/server';
import { getCurrentOrgId, getUserMemberships } from '@/lib/supabase/auth-server';

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
