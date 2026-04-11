type ScheduleCalendarItem = {
  startAt: string;
  endAt: string;
};

export type ScheduleCalendarDay<T> = {
  date: Date;
  inMonth: boolean;
  items: T[];
};

export type ScheduleCalendarMonth<T> = {
  label: string;
  days: ScheduleCalendarDay<T>[];
};

function startOfDay(value: string | Date) {
  const date = new Date(value);

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function startOfCalendarMonth(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = (first.getDay() + 6) % 7;
  return addDays(first, -dayOfWeek);
}

function endOfCalendarMonth(date: Date) {
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const dayOfWeek = (last.getDay() + 6) % 7;
  return addDays(last, 6 - dayOfWeek);
}

function enumerateDays(start: Date, end: Date) {
  const days: Date[] = [];
  let cursor = new Date(start);

  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return days;
}

export function buildScheduleCalendarMonths<T extends ScheduleCalendarItem>(items: T[]) {
  if (items.length === 0) {
    return [] as ScheduleCalendarMonth<T>[];
  }

  const earliest = items.reduce((current, item) =>
    new Date(item.startAt) < new Date(current.startAt) ? item : current,
  );
  const latest = items.reduce((current, item) =>
    new Date(item.endAt) > new Date(current.endAt) ? item : current,
  );

  const firstVisibleDay = startOfCalendarMonth(startOfDay(earliest.startAt));
  const lastVisibleDay = endOfCalendarMonth(startOfDay(latest.endAt));
  const allDays = enumerateDays(firstVisibleDay, lastVisibleDay);
  const monthStarts: Date[] = [];

  allDays.forEach((day) => {
    const monthStart = new Date(day.getFullYear(), day.getMonth(), 1);

    if (!monthStarts.some((existing) => sameDay(existing, monthStart))) {
      monthStarts.push(monthStart);
    }
  });

  return monthStarts
    .map<ScheduleCalendarMonth<T>>((monthStart) => {
      const monthStartVisible = startOfCalendarMonth(monthStart);
      const monthEndVisible = endOfCalendarMonth(monthStart);
      const days = enumerateDays(monthStartVisible, monthEndVisible).map<ScheduleCalendarDay<T>>((day) => ({
        date: day,
        inMonth: day.getMonth() === monthStart.getMonth(),
        items: items.filter((item) => {
          const itemStart = startOfDay(item.startAt);
          const itemEnd = startOfDay(item.endAt);
          return day >= itemStart && day <= itemEnd;
        }),
      }));

      return {
        label: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(monthStart),
        days,
      };
    })
    .filter((month) => month.days.some((day) => day.inMonth && day.items.length > 0));
}
