import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { ACTIVE_ORG_COOKIE, getUser } from '@/lib/supabase/auth-server';

// POST /api/orgs/invitations/:id/accept -> te suma como member a la org de
// la invitación (tiene que estar dirigida a tu email) y la deja como org
// activa.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabase = createServiceClient();

    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select('id, org_id, email')
      .eq('id', id)
      .ilike('email', user.email)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    }

    const { error: membershipError } = await supabase
      .from('memberships')
      .upsert(
        { user_id: user.id, org_id: invitation.org_id, role: 'member' },
        { onConflict: 'user_id,org_id', ignoreDuplicates: true }
      );

    if (membershipError) {
      console.error(membershipError);
      return NextResponse.json({ error: 'No se pudo aceptar la invitación' }, { status: 500 });
    }

    await supabase.from('invitations').delete().eq('id', id);

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE, invitation.org_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ ok: true, orgId: invitation.org_id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado aceptando la invitación' }, { status: 500 });
  }
}
