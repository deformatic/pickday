import { ScheduleResponseForm } from "@/components/schedule/schedule-response-form";

export default async function ScheduleRespondPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <ScheduleResponseForm token={token} />;
}
