export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin/overview', label: 'Огляд', icon: '📊' },
  { href: '/admin/visits', label: 'Відвідування', icon: '👥' },
  { href: '/admin/downloads', label: 'Скачування', icon: '📥' },
  { href: '/admin/ads', label: 'Реклама', icon: '💰' },
  { href: '/admin/storage', label: 'Сховище', icon: '☁️' },
  { href: '/admin/reports', label: 'Скарги', icon: '🚩' },
];

export function currentNavItem(pathname: string | null): NavItem | undefined {
  if (!pathname) return undefined;
  return ADMIN_NAV.find(n => pathname === n.href || pathname.startsWith(`${n.href}/`));
}
