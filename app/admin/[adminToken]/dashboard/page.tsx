import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ adminToken: string }>;
}) {
  const { adminToken } = await params;

  return <AdminDashboard adminToken={adminToken} />;
}
