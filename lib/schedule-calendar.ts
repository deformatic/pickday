import {
  addKstDays,
  endOfKstMonth,
  enumerateKstDays,
  formatKstDate,
  getKstStartOfDay,
  getKstWeekdayMondayIndex,
  sameKstDay,
  startOfKstMonth,
} from "@/lib/kst-date";

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

function startOfCalendarMonth(date: Date) {
  const first = startOfKstMonth(date);

  if (!first) {
    throw new Error("Failed to determine KST month start");
  }

  const dayOfWeek = getKstWeekdayMondayIndex(first);

  if (dayOfWeek === null) {
    throw new Error("Failed to determine KST weekday");
  }

  const start = addKstDays(first, -dayOfWeek);

  if (!start) {
    throw new Error("Failed to determine KST calendar start");
  }

  return start;
}

function endOfCalendarMonth(date: Date) {
  const last = endOfKstMonth(date);

  if (!last) {
    throw new Error("Failed to determine KST month end");
  }

  const dayOfWeek = getKstWeekdayMondayIndex(last);

  if (dayOfWeek === null) {
    throw new Error("Failed to determine KST weekday");
  }

  const end = addKstDays(last, 6 - dayOfWeek);

  if (!end) {
    throw new Error("Failed to determine KST calendar end");
  }

  return end;
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

  const earliestDay = getKstStartOfDay(earliest.startAt);
  const latestDay = getKstStartOfDay(latest.endAt);

  if (!earliestDay || !latestDay) {
    return [] as ScheduleCalendarMonth<T>[];
  }

  const firstVisibleDay = startOfCalendarMonth(earliestDay);
  const lastVisibleDay = endOfCalendarMonth(latestDay);
  const allDays = enumerateKstDays(firstVisibleDay, lastVisibleDay);
  const monthStarts: Date[] = [];

  allDays.forEach((day) => {
    const monthStart = startOfKstMonth(day);

    if (!monthStart) {
      return;
    }

    if (!monthStarts.some((existing) => sameKstDay(existing, monthStart))) {
      monthStarts.push(monthStart);
    }
  });

  return monthStarts
    .map<ScheduleCalendarMonth<T>>((monthStart) => {
      const monthStartVisible = startOfCalendarMonth(monthStart);
      const monthEndVisible = endOfCalendarMonth(monthStart);
      const days = enumerateKstDays(monthStartVisible, monthEndVisible).map<ScheduleCalendarDay<T>>((day) => ({
        date: day,
        inMonth: sameKstDay(startOfKstMonth(day) ?? day, monthStart),
        items: items.filter((item) => {
          const itemStart = getKstStartOfDay(item.startAt);
          const itemEnd = getKstStartOfDay(item.endAt);

          if (!itemStart || !itemEnd) {
            return false;
          }

          return day >= itemStart && day <= itemEnd;
        }),
      }));

      return {
        label: formatKstDate(monthStart, "ko-KR", { year: "numeric", month: "long" }),
        days,
      };
    })
    .filter((month) => month.days.some((day) => day.inMonth && day.items.length > 0));
}
