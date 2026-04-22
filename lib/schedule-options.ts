import { formatKstDate } from "@/lib/kst-date";

type ScheduleOptionTiming = {
  startAt: string;
  endAt: string;
  note?: string | null;
};

function formatDateTime(value: string) {
  return formatKstDate(value, "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatScheduleOptionWindow({ startAt, endAt }: ScheduleOptionTiming) {
  return `${formatDateTime(startAt)} ~ ${formatDateTime(endAt)}`;
}

export function formatScheduleOptionClockRange({ startAt, endAt }: ScheduleOptionTiming) {
  const formatter = {
    hour: "numeric",
    minute: "2-digit",
  } as const;

  return `${formatKstDate(startAt, "ko-KR", formatter)} ~ ${formatKstDate(endAt, "ko-KR", formatter)}`;
}

export function formatScheduleOptionTitle({ startAt, endAt, note }: ScheduleOptionTiming) {
  const range = formatScheduleOptionWindow({ startAt, endAt });

  if (!note || note.trim().length === 0) {
    return range;
  }

  return `${range} · ${note.trim()}`;
}
