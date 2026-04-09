import { AdminAccessForm } from "@/components/admin/admin-access-form";

export default async function AdminAccessPage({
  params,
}: {
  params: Promise<{ adminToken: string }>;
}) {
  const { adminToken } = await params;

  return <AdminAccessForm adminToken={adminToken} />;
}
