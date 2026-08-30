import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ETAPAS } from '@/lib/types';

// GET /api/dashboard -> métricas agregadas para /dashboard.
// Se agrega en JS (no en SQL) a propósito: a esta escala (cientos de
// negocios, decenas de leads) es más simple que mantener vistas SQL, y
// evita depender de RPCs extra para cada corte.
export async function GET() {
  try {
    const supabase = createServiceClient();

    const [zonasRes, negociosRes, leadsRes, negociosRubroRes] = await Promise.all([
      supabase.from('zonas').select('*', { count: 'exact', head: true }),
      supabase.from('negocios').select('*', { count: 'exact', head: true }),
      supabase.from('leads').select('etapa'),
      supabase.from('negocios').select('rubro'),
    ]);

    if (leadsRes.error || negociosRubroRes.error) {
      console.error(leadsRes.error ?? negociosRubroRes.error);
      return NextResponse.json({ error: 'No se pudieron calcular las métricas' }, { status: 500 });
    }

    // Sin "label": el nombre de la etapa para mostrar se resuelve en el
    // cliente vía t.etapas[etapa] (el idioma es una preferencia del
    // browser, no algo que el server deba decidir).
    const porEtapa = ETAPAS.map((etapa) => ({
      etapa,
      count: (leadsRes.data ?? []).filter((l) => l.etapa === etapa).length,
    }));

    const rubroCounts = new Map<string, number>();
    (negociosRubroRes.data ?? []).forEach((n) => {
      if (!n.rubro) return;
      rubroCounts.set(n.rubro, (rubroCounts.get(n.rubro) ?? 0) + 1);
    });
    const porRubro = Array.from(rubroCounts.entries())
      .map(([rubro, count]) => ({ rubro, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totalLeads = leadsRes.data?.length ?? 0;
    const ganados = porEtapa.find((e) => e.etapa === 'ganado')?.count ?? 0;
    const perdidos = porEtapa.find((e) => e.etapa === 'perdido')?.count ?? 0;
    const cerrados = ganados + perdidos;

    return NextResponse.json({
      zonasCount: zonasRes.count ?? 0,
      negociosCount: negociosRes.count ?? 0,
      totalLeads,
      porEtapa,
      porRubro,
      tasaGanados: cerrados > 0 ? ganados / cerrados : null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Error inesperado calculando métricas' }, { status: 500 });
  }
}
