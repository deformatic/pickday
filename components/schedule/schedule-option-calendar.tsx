"use client";

import { buildScheduleCalendarMonths } from "@/lib/schedule-calendar";
import { formatScheduleOptionClockRange, formatScheduleOptionWindow } from "@/lib/schedule-options";
import type { ScheduleOption } from "@/types/schedule";

type ScheduleOptionCalendarProps = {
  options: ScheduleOption[];
  selectedOptionIds: number[];
  onToggle: (optionId: number) => void;
};

const weekdayLabels = ["월", "화", "수", "목", "금", "토", "일"];

export function ScheduleOptionCalendar({ options, selectedOptionIds, onToggle }: ScheduleOptionCalendarProps) {
  const months = buildScheduleCalendarMonths(options);

  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
      <div className="flex flex-col gap-2 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">가능 일정 *</h2>
          <p className="mt-1 text-sm text-stone-600 [word-break:keep-all]">캘린더에서 가능한 일정을 눌러 응답을 체크하세요.</p>
        </div>
        <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-stone-50">
          {selectedOptionIds.length}개 선택
        </span>
      </div>

      <div className="mt-6 grid gap-8">
        {months.map((month) => (
          <section key={month.label} className="grid gap-4">
            <h3 className="text-lg font-semibold text-stone-950">{month.label}</h3>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
              {weekdayLabels.map((weekday) => (
                <div key={weekday} className="py-2">{weekday}</div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:hidden">
              {month.days
                .filter((day) => day.inMonth && day.items.length > 0)
                .map((day) => (
                  <article key={day.date.toISOString()} className="rounded-[1.4rem] border border-stone-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-stone-950">
                      {new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(day.date)}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {day.items.map((option) => {
                        const checked = selectedOptionIds.includes(option.id);

                        return (
                          <button
                            key={`${day.date.toISOString()}-${option.id}`}
                            type="button"
                            onClick={() => onToggle(option.id)}
                            className={`rounded-2xl border px-3 py-3 text-left transition ${
                              checked
                                ? "border-stone-950 bg-stone-950 text-stone-50 shadow-[0_18px_32px_rgba(28,25,23,0.2)]"
                                : "border-stone-300 bg-stone-50 text-stone-900 hover:border-stone-950 hover:bg-white"
                            }`}
                          >
                            <p className="text-xs font-semibold [word-break:keep-all]">{option.note || formatScheduleOptionWindow(option)}</p>
                            <p className={`mt-1 text-xs ${checked ? "text-stone-300" : "text-stone-500"}`}>
                              {formatScheduleOptionClockRange(option)}
                            </p>
                          </button>
                        );
                      })}
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
                      {day.items.length > 0 ? (
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                          {day.items.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 grid gap-2">
                      {day.items.slice(0, 3).map((option) => {
                        const checked = selectedOptionIds.includes(option.id);

                        return (
                          <button
                            key={`${day.date.toISOString()}-${option.id}`}
                            type="button"
                            onClick={() => onToggle(option.id)}
                            className={`rounded-2xl border px-3 py-2 text-left transition ${
                              checked
                                ? "border-stone-950 bg-stone-950 text-stone-50 shadow-[0_18px_32px_rgba(28,25,23,0.2)]"
                                : "border-stone-300 bg-stone-50/80 text-stone-900 hover:border-stone-950 hover:bg-white"
                            }`}
                          >
                            <p className="text-xs font-semibold [word-break:keep-all]">{option.note || formatScheduleOptionWindow(option)}</p>
                            <p className={`mt-1 text-[11px] ${checked ? "text-stone-300" : "text-stone-500"}`}>
                              {formatScheduleOptionClockRange(option)}
                            </p>
                          </button>
                        );
                      })}

                      {day.items.length > 3 ? (
                        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-3 py-2 text-[11px] text-stone-500">
                          +{day.items.length - 3}개 일정 더 있음
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
