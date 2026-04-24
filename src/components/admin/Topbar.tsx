'use client';
import { usePathname } from 'next/navigation';
import { currentNavItem } from './nav';

interface TopbarProps {
  onOpenSidebar: () => void;
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const pathname = usePathname();
  const item = currentNavItem(pathname);

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-[#0f172a]/95 backdrop-blur border-b border-white/10 px-3 py-2.5 flex items-center gap-3">
      <button
        onClick={onOpenSidebar}
        className="p-2 -ml-2 text-slate-200 hover:bg-white/5 rounded-lg"
        aria-label="Відкрити меню"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg shrink-0">{item?.icon ?? '📚'}</span>
        <span className="text-sm font-semibold text-slate-100 truncate">{item?.label ?? 'UkrBooks Admin'}</span>
      </div>
    </header>
  );
}
