type ScheduleOptionTiming = {
  startAt: string;
  endAt: string;
  note?: string | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatScheduleOptionWindow({ startAt, endAt }: ScheduleOptionTiming) {
  return `${formatDateTime(startAt)} ~ ${formatDateTime(endAt)}`;
}

export function formatScheduleOptionClockRange({ startAt, endAt }: ScheduleOptionTiming) {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formatter.format(new Date(startAt))} ~ ${formatter.format(new Date(endAt))}`;
}

export function formatScheduleOptionTitle({ startAt, endAt, note }: ScheduleOptionTiming) {
  const range = formatScheduleOptionWindow({ startAt, endAt });

  if (!note || note.trim().length === 0) {
    return range;
  }

  return `${range} · ${note.trim()}`;
}
