'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { createBrowserSupabase } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageProvider';
import type { OrgMembership } from '@/lib/types';

export default function AvatarMenu({ email }: { email: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Misma key que components/Sidebar.tsx: comparten el cache de SWR, no se
  // vuelve a pedir de nuevo solo porque este componente también lo usa.
  const { data } = useSWR<{ orgs: OrgMembership[]; activeOrgId: string | null }>('/api/orgs');
  const activeOrg = data?.orgs.find((o) => o.orgId === data.activeOrgId);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/20 bg-surface-container-highest font-label text-xs font-semibold text-on-surface-variant hover:opacity-90"
        title={email}
      >
        {email.slice(0, 1).toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[1100] mt-2 w-64 rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-[0px_8px_24px_rgba(103,75,181,0.12)]">
          <div className="border-b border-outline-variant/10 px-4 py-3">
            <p className="min-w-0 truncate text-sm font-semibold text-on-surface" title={email}>
              {email}
            </p>
            {activeOrg && (
              <p className="font-label mt-0.5 text-xs text-on-surface-variant">
                {activeOrg.orgNombre} · {t.roles[activeOrg.role]}
              </p>
            )}
          </div>
          <div className="flex flex-col p-1.5">
            <Link
              href="/configuracion"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-on-surface hover:bg-surface-container-highest"
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              {t.configuracion.title}
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-on-surface-variant hover:bg-error-container/50 hover:text-on-error-container"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              {t.nav.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
