"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearAdminPassword, getAdminPassword } from "@/lib/client/admin-auth";
import { AdminResponseCalendar } from "@/components/admin/admin-response-calendar";
import { formatScheduleOptionTitle, formatScheduleOptionWindow } from "@/lib/schedule-options";
import type { AdminDashboardData } from "@/types/admin";

type AdminDashboardProps = {
  adminToken: string;
};

export function AdminDashboard({ adminToken }: AdminDashboardProps) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      const password = getAdminPassword(adminToken);

      if (!password) {
        router.replace(`/admin/${adminToken}`);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/${adminToken}/responses`, {
          headers: {
            "x-admin-password": password,
          },
        });

        const data = (await response.json()) as AdminDashboardData & { error?: string };

        if (!response.ok) {
          if (response.status === 401 && isMounted) {
            clearAdminPassword(adminToken);
            router.replace(`/admin/${adminToken}`);
            return;
          }

          throw new Error(data.error ?? "대시보드를 불러오지 못했습니다.");
        }

        if (isMounted) {
          setDashboard(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : "대시보드를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [adminToken, router]);

  async function assignOption(responseId: number, assignedOptionId: number | null) {
    const password = getAdminPassword(adminToken);

    if (!password) {
      router.replace(`/admin/${adminToken}`);
      return;
    }

    setAssignmentMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/${adminToken}/responses/${responseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminPassword: password,
          assignedOptionId,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "배정 상태를 업데이트하지 못했습니다.");
      }

      setAssignmentMessage(assignedOptionId === null ? "배정을 해제했습니다." : "배정을 저장했습니다.");

      const refreshResponse = await fetch(`/api/admin/${adminToken}/responses`, {
        headers: {
          "x-admin-password": password,
        },
      });
      const refreshData = (await refreshResponse.json()) as AdminDashboardData & { error?: string };

      if (!refreshResponse.ok) {
        throw new Error(refreshData.error ?? "대시보드를 새로고침하지 못했습니다.");
      }

      setDashboard(refreshData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "배정 상태를 업데이트하지 못했습니다.");
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5efe3_0%,#ebe2d3_100%)] px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <section className="rounded-[2rem] border border-stone-900/10 bg-stone-950 px-6 py-8 text-stone-50 shadow-[0_32px_70px_rgba(28,25,23,0.18)] sm:px-8">
          <p className="text-xs tracking-[0.28em] text-stone-400 uppercase">Admin dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] [word-break:keep-all] sm:text-4xl">
            {dashboard?.schedule.title ?? "응답 대시보드"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-stone-300 [word-break:keep-all] sm:text-base">
            {dashboard ? dashboard.schedule.location : "응답과 집계를 불러오는 중입니다."}
          </p>
          {dashboard ? (
            <p className="mt-2 text-sm leading-6 text-stone-300 [word-break:keep-all]">비고: {dashboard.schedule.note}</p>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {assignmentMessage ? (
          <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {assignmentMessage}
          </div>
        ) : null}

        {isLoading ? <p className="text-sm text-stone-500">대시보드를 불러오는 중...</p> : null}

        {dashboard ? (
          <>
            <AdminResponseCalendar dashboard={dashboard} />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {dashboard.aggregates.map((aggregate) => (
                <article
                  key={aggregate.optionId}
                  className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-5 shadow-[0_18px_36px_rgba(120,113,108,0.12)]"
                >
                  <p className="text-xs tracking-[0.24em] text-stone-500 uppercase">Option</p>
                  <h2 className="mt-3 text-lg font-semibold text-stone-950 [word-break:keep-all]">{formatScheduleOptionTitle(aggregate)}</h2>
                  <p className="mt-1 text-sm text-stone-600 [word-break:keep-all]">{formatScheduleOptionWindow(aggregate)}</p>
                  <p className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{aggregate.responseCount}</p>
                  <p className="text-sm text-stone-500">응답</p>
                </article>
              ))}
            </section>

            <section className="rounded-[2rem] border border-stone-200 bg-white/85 p-5 shadow-[0_22px_44px_rgba(120,113,108,0.14)] sm:p-6">
              <div className="flex flex-col gap-2 border-b border-stone-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs tracking-[0.24em] text-stone-500 uppercase">Responses</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950">강사 응답 목록</h2>
                </div>
                <p className="text-sm text-stone-600">{dashboard.responses.length}명의 응답</p>
              </div>

              {dashboard.responses.length === 0 ? (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-600">
                  아직 응답이 없습니다.
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {dashboard.responses.map((response) => (
                    <article key={response.id} className="rounded-[1.75rem] border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
                      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                        <div className="grid gap-2 text-sm text-stone-700">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-stone-950">{response.name}</h3>
                            {response.assignedOptionId ? (
                              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                                배정 완료
                              </span>
                            ) : null}
                          </div>
                          <p>이메일: {response.email ?? "미입력"}</p>
                          <p>전화번호: {response.phone ?? "미입력"}</p>
                          <p>제출 시각: {new Date(response.createdAt).toLocaleString("ko-KR")}</p>
                          <p className="[word-break:keep-all]">선택 일정: {response.selectedOptions.map((option) => formatScheduleOptionTitle(option)).join(" / ") || "없음"}</p>
                          <p>코멘트: {response.comment ?? "없음"}</p>
                        </div>

                        <div className="grid gap-2">
                          <p className="text-sm font-medium text-stone-700">강사 배정</p>
                          <div className="grid gap-2">
                            {dashboard.options.map((option) => {
                              const isAssigned = response.assignedOptionId === option.id;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => assignOption(response.id, isAssigned ? null : option.id)}
                                  className={`flex items-center justify-between rounded-[1.25rem] border px-4 py-3 text-left text-sm transition ${
                                    isAssigned
                                      ? "border-stone-950 bg-stone-950 text-stone-50"
                                      : "border-stone-300 bg-white text-stone-900 hover:border-stone-950"
                                  }`}
                                >
                                  <span>
                                    <span className="block font-semibold [word-break:keep-all]">{formatScheduleOptionTitle(option)}</span>
                                    <span className={`mt-1 block text-xs ${isAssigned ? "text-stone-300" : "text-stone-500"}`}>
                                      {formatScheduleOptionWindow(option)}
                                    </span>
                                  </span>
                                  <span className="ml-4 rounded-full border border-current px-3 py-1 text-xs font-medium">
                                    {isAssigned ? "배정 해제" : "배정"}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
