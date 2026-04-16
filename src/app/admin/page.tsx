import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session')?.value;
  const adminPassword = process.env.ADMIN_PASSWORD || 'ukrbooks-admin-2024';
  const expected = Buffer.from(adminPassword).toString('base64');

  if (session === expected) {
    redirect('/admin/dashboard');
  } else {
    redirect('/admin/login');
  }
}
