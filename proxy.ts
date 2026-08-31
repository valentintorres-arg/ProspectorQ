import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Protege toda la app: sin sesión, redirige a /login (o devuelve 401 en /api).
// `middleware.ts` fue renombrado a `proxy.ts` en Next.js 16 — misma API.
// /api/keepalive queda afuera porque lo pega el cron de Vercel (sin cookie
// de sesión posible) — se autentica solo con CRON_SECRET, adentro del route.
// /forgot-password y /auth/callback son parte del flujo de "olvidé mi
// contraseña": por definición, se usan sin sesión todavía. /reset-password
// NO está acá a propósito — para llegar ahí con sesión válida hay que pasar
// por el link del mail, que es lo que exige que sea el usuario dueño de esa
// cuenta el que cambie la contraseña.
// /signup es el registro público, y /pending-approval es adonde cae una
// cuenta recién creada (sin aprobar todavía) — ver el chequeo de "approved"
// más abajo.
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/callback',
  '/pending-approval',
  '/api/keepalive',
];

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() (no getSession()) valida el JWT contra Supabase Auth en vez
  // de confiar ciegamente en la cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);

  if (!user && !isPublic) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/mapa';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Cuenta autenticada pero todavía no aprobada por el equipo (ver
  // supabase/migrations/0005_profiles_approval.sql): no entra a ninguna
  // página ni API real, solo puede ver /pending-approval.
  if (user && !isPublic) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', user.id)
      .single();

    if (!profile?.approved) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Cuenta pendiente de aprobación' }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = '/pending-approval';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
