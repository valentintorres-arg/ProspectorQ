import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase/server';

// Adonde llega el link del mail de "recuperar contraseña" (y en el futuro
// cualquier otro flujo basado en link: invitaciones, magic link, etc.).
// Supabase redirige acá con ?code=..., que canjeamos por una sesión real
// antes de mandar al usuario a la página que la necesita.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
