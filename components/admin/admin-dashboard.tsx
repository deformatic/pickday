"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AdminResponseCalendar } from "@/components/admin/admin-response-calendar";
import { FounderNudge } from "@/components/ui/founder-nudge";
import { formatScheduleOptionTitle, formatScheduleOptionWindow } from "@/lib/schedule-options";
import type { AdminDashboardData } from "@/types/admin";

type AdminDashboardProps = {
  adminToken: string;
};

type PendingAssignment = {
  responseId: number;
  optionId: number;
  nextAssignedOptionId: number | null;
};

function applyOptimisticAssignment(
  dashboard: AdminDashboardData,
  responseId: number,
  assignedOptionId: number | null,
): AdminDashboardData {
  return {
    ...dashboard,
    responses: dashboard.responses.map((response) => {
      if (response.id === responseId) {
        return {
          ...response,
          assignedOptionId,
        };
      }

      if (assignedOptionId !== null && response.assignedOptionId === assignedOptionId) {
        return {
          ...response,
          assignedOptionId: null,
        };
      }

      return response;
    }),
  };
}

export function AdminDashboard({ adminToken }: AdminDashboardProps) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<PendingAssignment | null>(null);

  async function refreshDashboard() {
    const refreshResponse = await fetch(`/api/admin/${adminToken}/responses`);
    const refreshData = (await refreshResponse.json()) as AdminDashboardData & { error?: string };

    if (!refreshResponse.ok) {
      throw new Error(refreshData.error ?? "대시보드를 새로고침하지 못했습니다.");
    }

    setDashboard(refreshData);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/admin/${adminToken}/responses`);

        const data = (await response.json()) as AdminDashboardData & { error?: string };

        if (!response.ok) {
          if (response.status === 401 && isMounted) {
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
    if (!dashboard || pendingAssignment) {
      return;
    }

    setAssignmentMessage(null);
    setError(null);
    const currentResponse = dashboard.responses.find((response) => response.id === responseId);

    if (!currentResponse) {
      return;
    }

    const optionId = assignedOptionId ?? currentResponse.assignedOptionId;

    if (optionId === null) {
      return;
    }

    const previousDashboard = dashboard;
    let assignmentPersisted = false;
    setPendingAssignment({
      responseId,
      optionId,
      nextAssignedOptionId: assignedOptionId,
    });
    setDashboard(applyOptimisticAssignment(dashboard, responseId, assignedOptionId));

    try {
      const response = await fetch(`/api/admin/${adminToken}/responses/${responseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignedOptionId,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "배정 상태를 업데이트하지 못했습니다.");
      }

      assignmentPersisted = true;
      setAssignmentMessage(assignedOptionId === null ? "배정을 해제했습니다." : "배정을 저장했습니다.");

      await refreshDashboard();
    } catch (requestError) {
      if (!assignmentPersisted) {
        setDashboard(previousDashboard);
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : assignmentPersisted
            ? "배정은 저장됐지만 최신 상태를 다시 불러오지 못했습니다."
            : "배정 상태를 업데이트하지 못했습니다.",
      );
    } finally {
      setPendingAssignment(null);
    }
  }

  async function deleteResponse(responseId: number) {
    setAssignmentMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/${adminToken}/responses/${responseId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "응답을 삭제하지 못했습니다.");
      }

      setAssignmentMessage("강사 응답을 삭제했습니다.");
      await refreshDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "응답을 삭제하지 못했습니다.");
    }
  }

  async function removeSelectedOption(responseId: number, optionId: number) {
    setAssignmentMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/${adminToken}/responses/${responseId}/options/${optionId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "선택 일정을 제거하지 못했습니다.");
      }

      setAssignmentMessage("선택 일정을 제거했습니다.");
      await refreshDashboard();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "선택 일정을 제거하지 못했습니다.");
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

            <FounderNudge
              title="교육 운영 맞춤 기능이 더 필요하신가요?"
              description="강사 배정 자동화, 기관별 브랜딩, 운영 프로세스 확장까지 현재 대시보드 흐름에 맞춰 추가 개발을 진행할 수 있습니다."
            />

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
                            <button
                              type="button"
                              onClick={() => deleteResponse(response.id)}
                              className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:border-red-400 hover:bg-red-100"
                            >
                              강사 제거
                            </button>
                          </div>
                          <p>이메일: {response.email ?? "미입력"}</p>
                          <p>전화번호: {response.phone ?? "미입력"}</p>
                          <p>제출 시각: {new Date(response.createdAt).toLocaleString("ko-KR")}</p>
                          <div className="grid gap-2">
                            <p className="font-medium text-stone-700">선택 일정</p>
                            {response.selectedOptions.length === 0 ? (
                              <p className="[word-break:keep-all]">없음</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {response.selectedOptions.map((option) => (
                                  <div key={option.id} className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 shadow-sm">
                                    <span className="[word-break:keep-all]">{formatScheduleOptionTitle(option)}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeSelectedOption(response.id, option.id)}
                                      className="rounded-full border border-red-200 px-2 py-0.5 text-[11px] font-medium text-red-700 transition hover:border-red-400 hover:bg-red-50"
                                    >
                                      일자 제거
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <p>코멘트: {response.comment ?? "없음"}</p>
                        </div>

                        <div className="grid gap-2">
                          <p className="text-sm font-medium text-stone-700">강사 배정</p>
                          <div className="grid gap-2">
                            {dashboard.options.map((option) => {
                              const isAssigned = response.assignedOptionId === option.id;
                              const isPendingTarget =
                                pendingAssignment?.responseId === response.id && pendingAssignment.optionId === option.id;
                              const isAssignmentLocked = pendingAssignment !== null;

                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => assignOption(response.id, isAssigned ? null : option.id)}
                                  disabled={isAssignmentLocked}
                                  aria-busy={isPendingTarget}
                                  className={`flex items-center justify-between rounded-[1.25rem] border px-4 py-3 text-left text-sm transition ${
                                    isAssigned
                                      ? "border-stone-950 bg-stone-950 text-stone-50"
                                      : "border-stone-300 bg-white text-stone-900 hover:border-stone-950"
                                  } ${isAssignmentLocked ? "cursor-wait opacity-70" : ""}`}
                                >
                                  <span>
                                    <span className="block font-semibold [word-break:keep-all]">{formatScheduleOptionTitle(option)}</span>
                                    <span className={`mt-1 block text-xs ${isAssigned ? "text-stone-300" : "text-stone-500"}`}>
                                      {formatScheduleOptionWindow(option)}
                                    </span>
                                  </span>
                                  <span className="ml-4 rounded-full border border-current px-3 py-1 text-xs font-medium">
                                    {isPendingTarget
                                      ? pendingAssignment.nextAssignedOptionId === null
                                        ? "해제 중..."
                                        : "저장 중..."
                                      : isAssigned
                                        ? "배정 해제"
                                        : "배정"}
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
