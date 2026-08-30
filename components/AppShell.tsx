'use client';

import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

const STORAGE_KEY = 'prospector-sidebar-collapsed';

export default function AppShell({ email, children }: { email: string; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage (no disponible en el render del servidor)
      setCollapsed(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // localStorage puede fallar en modo privado; se queda expandido.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // no persiste, pero el toggle sigue andando en la sesión actual
      }
      return next;
    });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar email={email} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      <div
        className={`flex h-screen flex-1 flex-col overflow-hidden transition-[margin-left] duration-200 ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <TopBar email={email} />
        <main className="flex-1 overflow-y-auto md:overflow-hidden">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
