'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ADMIN_NAV } from './nav';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#111827] border-r border-white/10 flex flex-col transform transition-transform duration-200 ease-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
      aria-hidden={!open}
    >
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">📚</span>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-sm truncate">UkrBooks Admin</h1>
            <p className="text-slate-500 text-[11px] truncate">ukrbooks.ink</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-slate-400 hover:text-white text-xl px-2 -mr-2"
          aria-label="Закрити меню"
        >
          ×
        </button>
      </div>
      <nav className="flex-1 py-3 space-y-1 px-2 overflow-y-auto">
        {ADMIN_NAV.map(item => {
          const active = pathname === item.href || (pathname !== null && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10 space-y-1">
        <a
          href="https://ukrbooks.ink"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span className="text-base">🌐</span> Сайт ↗
        </a>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          <span className="text-base">🚪</span> {loggingOut ? 'Вихід...' : 'Вийти'}
        </button>
      </div>
    </aside>
  );
}
