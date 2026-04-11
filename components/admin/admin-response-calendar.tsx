"use client";

import { formatScheduleOptionWindow } from "@/lib/schedule-options";
import type { AdminDashboardData, AdminScheduleOption } from "@/types/admin";

type AdminResponseCalendarProps = {
  dashboard: AdminDashboardData;
};

type CalendarOptionSummary = AdminScheduleOption & {
  selectedCount: number;
  assignedCount: number;
  assignedNames: string[];
};

type CalendarDay = {
  date: Date;
  inMonth: boolean;
  summaries: CalendarOptionSummary[];
};

const weekdayLabels = ["월", "화", "수", "목", "금", "토", "일"];

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

function buildOptionSummaries(dashboard: AdminDashboardData): CalendarOptionSummary[] {
  return dashboard.options.map((option) => {
    const selectingResponses = dashboard.responses.filter((response) =>
      response.selectedOptions.some((selectedOption) => selectedOption.id === option.id),
    );
    const assignedResponses = dashboard.responses.filter((response) => response.assignedOptionId === option.id);

    return {
      ...option,
      selectedCount: selectingResponses.length,
      assignedCount: assignedResponses.length,
      assignedNames: assignedResponses.map((response) => response.name),
    };
  });
}

function buildCalendarMonths(optionSummaries: CalendarOptionSummary[]) {
  if (optionSummaries.length === 0) {
    return [] as Array<{ label: string; days: CalendarDay[] }>;
  }

  const earliest = optionSummaries.reduce((current, option) =>
    new Date(option.startAt) < new Date(current.startAt) ? option : current,
  );
  const latest = optionSummaries.reduce((current, option) =>
    new Date(option.endAt) > new Date(current.endAt) ? option : current,
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

  return monthStarts.map((monthStart) => {
    const monthStartVisible = startOfCalendarMonth(monthStart);
    const monthEndVisible = endOfCalendarMonth(monthStart);
    const days = enumerateDays(monthStartVisible, monthEndVisible).map<CalendarDay>((day) => ({
      date: day,
      inMonth: day.getMonth() === monthStart.getMonth(),
      summaries: optionSummaries.filter((option) => {
        const optionStart = startOfDay(option.startAt);
        const optionEnd = startOfDay(option.endAt);
        return day >= optionStart && day <= optionEnd;
      }),
    }));

    return {
      label: new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(monthStart),
      days,
    };
  });
}

function formatOptionTimeRange(option: CalendarOptionSummary) {
  const start = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(option.startAt));
  const end = new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(option.endAt));

  return `${start} ~ ${end}`;
}

export function AdminResponseCalendar({ dashboard }: AdminResponseCalendarProps) {
  const optionSummaries = buildOptionSummaries(dashboard);
  const months = buildCalendarMonths(optionSummaries);

  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white/90 p-5 shadow-[0_22px_44px_rgba(120,113,108,0.14)] sm:p-6">
      <div className="flex flex-col gap-2 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.24em] text-stone-500 uppercase">Calendar overview</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">응답 캘린더</h2>
        </div>
        <p className="text-sm text-stone-600 [word-break:keep-all]">
          날짜별로 어떤 일정 후보에 응답이 몰렸는지 한눈에 확인하세요.
        </p>
      </div>

      <div className="mt-6 grid gap-8">
        {months.map((month) => (
          <section key={month.label} className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-stone-950">{month.label}</h3>
              <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                <span className="rounded-full bg-stone-100 px-3 py-1">선택 수</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">배정 수</span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              {weekdayLabels.map((weekday) => (
                <div key={weekday} className="py-2">{weekday}</div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:hidden">
              {month.days
                .filter((day) => day.inMonth)
                .map((day) => (
                  <article key={day.date.toISOString()} className="rounded-[1.4rem] border border-stone-200 bg-stone-50/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-stone-950">
                        {new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(day.date)}
                      </p>
                      <span className="text-xs text-stone-500">{day.summaries.length}개 일정</span>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {day.summaries.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-3 py-3 text-xs text-stone-500">
                          응답 일정 없음
                        </div>
                      ) : (
                        day.summaries.map((summary) => (
                          <div key={`${day.date.toISOString()}-${summary.id}`} className="rounded-2xl border border-stone-200 bg-white px-3 py-3 text-left shadow-sm">
                            <p className="text-xs font-semibold text-stone-900 [word-break:keep-all]">{summary.note || formatScheduleOptionWindow(summary)}</p>
                            <p className="mt-1 text-xs text-stone-500">{formatOptionTimeRange(summary)}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-700">선택 {summary.selectedCount}</span>
                              <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">배정 {summary.assignedCount}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                ))}
            </div>

            <div className="hidden overflow-hidden rounded-[1.75rem] border border-stone-200 xl:block">
              <div className="grid grid-cols-7 gap-px bg-stone-200">
                {month.days.map((day) => (
                  <div
                    key={day.date.toISOString()}
                    className={`min-h-44 bg-white p-3 align-top ${day.inMonth ? "" : "bg-stone-50/80 text-stone-400"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-semibold ${day.inMonth ? "text-stone-950" : "text-stone-400"}`}>
                        {day.date.getDate()}
                      </span>
                      {day.summaries.length > 0 ? (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                          {day.summaries.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2">
                      {day.summaries.slice(0, 3).map((summary) => (
                        <div key={`${day.date.toISOString()}-${summary.id}`} className="rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-2 shadow-sm">
                          <p className="text-xs font-semibold text-stone-900 [word-break:keep-all]">
                            {summary.note || formatScheduleOptionWindow(summary)}
                          </p>
                          <p className="mt-1 text-[11px] text-stone-500">{formatOptionTimeRange(summary)}</p>
                          <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                            <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-700">선택 {summary.selectedCount}</span>
                            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">배정 {summary.assignedCount}</span>
                          </div>
                          {summary.assignedNames.length > 0 ? (
                            <p className="mt-2 text-[11px] leading-5 text-stone-600 [word-break:keep-all]">
                              {summary.assignedNames.join(", ")}
                            </p>
                          ) : null}
                        </div>
                      ))}

                      {day.summaries.length > 3 ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-3 py-2 text-[11px] text-stone-500">
                          +{day.summaries.length - 3}개 일정 더 있음
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
