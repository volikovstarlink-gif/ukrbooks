'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/admin/overview', label: 'Огляд', icon: '📊' },
  { href: '/admin/visits', label: 'Відвідування', icon: '👥' },
  { href: '/admin/downloads', label: 'Скачування', icon: '📥' },
  { href: '/admin/ads', label: 'Реклама', icon: '💰' },
  { href: '/admin/storage', label: 'Сховище', icon: '☁️' },
];

export default function Sidebar() {
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
    <aside className="w-60 bg-[#111827] border-r border-white/10 flex flex-col">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📚</span>
          <div>
            <h1 className="font-bold text-white text-sm">UkrBooks Admin</h1>
            <p className="text-slate-500 text-[11px]">ukrbooks.ink</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-3 space-y-1 px-2">
        {NAV.map(item => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-slate-300 hover:bg-white/5 hover:text-white'
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
