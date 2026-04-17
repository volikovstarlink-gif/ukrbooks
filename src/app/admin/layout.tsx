import { cookies } from 'next/headers';
import { SESSION_COOKIE, verifySession } from '@/lib/admin-auth';
import AdminShell from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  const valid = await verifySession(session);

  if (!valid) {
    return <div className="fixed inset-0 z-[60] bg-[#0f172a] overflow-y-auto">{children}</div>;
  }

  return <AdminShell>{children}</AdminShell>;
}
