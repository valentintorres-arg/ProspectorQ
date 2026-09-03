import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentMembership } from '@/lib/supabase/auth-server';

// DELETE /api/orgs/invitations/:id -> revoca una invitación pendiente
// mandada por la org activa. Solo owner/admin de esa org.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'No tenés permiso para revocar invitaciones' }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)
      .eq('org_id', membership.orgId);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudo revocar la invitación' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado revocando la invitación' }, { status: 500 });
  }
}
