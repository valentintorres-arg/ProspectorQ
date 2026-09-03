import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/supabase/auth-server';

// POST /api/orgs/invitations/:id/decline -> rechaza una invitación dirigida
// a tu email (simplemente la borra).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const user = await getUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)
      .ilike('email', user.email)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudo rechazar la invitación' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado rechazando la invitación' }, { status: 500 });
  }
}
