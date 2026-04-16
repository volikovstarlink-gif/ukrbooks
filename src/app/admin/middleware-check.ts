// Admin auth helper — used by admin routes
export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'ukrbooks-admin-2024';
}
