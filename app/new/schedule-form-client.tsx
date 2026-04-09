"use client";

import dynamic from "next/dynamic";

const NewScheduleForm = dynamic(
  () => import("@/components/schedule/new-schedule-form").then((module) => module.NewScheduleForm),
  {
    ssr: false,
  },
);

export function NewScheduleFormClient() {
  return <NewScheduleForm />;
}
