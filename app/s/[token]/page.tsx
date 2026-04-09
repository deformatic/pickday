import { ScheduleAccessGate } from "@/components/schedule/schedule-access-gate";

export default async function ScheduleGatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <ScheduleAccessGate token={token} />;
}
