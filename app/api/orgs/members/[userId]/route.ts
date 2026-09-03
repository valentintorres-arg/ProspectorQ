import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getCurrentMembership } from '@/lib/supabase/auth-server';
import type { MembershipRole } from '@/lib/types';

const ROLES_ASIGNABLES: MembershipRole[] = ['admin', 'member'];

// DELETE /api/orgs/members/:userId -> saca a ese usuario de la org activa.
// owner/admin pueden sacar a un member; sacar a un admin requiere ser owner;
// nadie puede sacar al owner.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json({ error: 'No tenés permiso para sacar miembros' }, { status: 403 });
    }

    const supabase = createServiceClient();

    const { data: target, error: targetError } = await supabase
      .from('memberships')
      .select('role')
      .eq('org_id', membership.orgId)
      .eq('user_id', userId)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });
    }
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'No se puede sacar al owner' }, { status: 403 });
    }
    if (target.role === 'admin' && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Solo el owner puede sacar a un admin' }, { status: 403 });
    }

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('org_id', membership.orgId)
      .eq('user_id', userId);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudo sacar al miembro' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado sacando al miembro' }, { status: 500 });
  }
}

// PATCH /api/orgs/members/:userId  { role } -> cambia el rol de ese miembro
// dentro de la org activa. Solo el owner, y nunca sobre la fila del owner.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }
    if (membership.role !== 'owner') {
      return NextResponse.json({ error: 'Solo el owner puede cambiar roles' }, { status: 403 });
    }

    const body = await req.json();
    const role: MembershipRole = body.role;
    if (!ROLES_ASIGNABLES.includes(role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: target, error: targetError } = await supabase
      .from('memberships')
      .select('role')
      .eq('org_id', membership.orgId)
      .eq('user_id', userId)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 });
    }
    if (target.role === 'owner') {
      return NextResponse.json({ error: 'No se puede cambiar el rol del owner' }, { status: 403 });
    }

    const { error } = await supabase
      .from('memberships')
      .update({ role })
      .eq('org_id', membership.orgId)
      .eq('user_id', userId);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'No se pudo cambiar el rol' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado cambiando el rol' }, { status: 500 });
  }
}
