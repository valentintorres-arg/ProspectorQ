import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/keepalive -> pegada por el cron de Vercel (ver vercel.json) para
// que Supabase no pause el proyecto por inactividad (el free tier pausa a
// los ~7 días sin requests a la API). Alcanza con cualquier query liviana.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('zonas').select('id', { count: 'exact', head: true });

  if (error) {
    console.error('Keepalive error:', error);
    return NextResponse.json({ error: 'Falló el ping a Supabase' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
}
