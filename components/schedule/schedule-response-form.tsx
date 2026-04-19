"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ScheduleOptionCalendar } from "@/components/schedule/schedule-option-calendar";
import { FounderNudge } from "@/components/ui/founder-nudge";
import type { PublicSchedule, VerifiedScheduleDetails } from "@/types/schedule";

type SubmitResult = {
  responseId: number;
  updated?: boolean;
  editUrl?: string;
};

type ScheduleResponseFormProps = {
  token: string;
};

export function ScheduleResponseForm({ token }: ScheduleResponseFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [schedule, setSchedule] = useState<VerifiedScheduleDetails | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editToken = searchParams.get("editToken") ?? "";
  const editResponseId = searchParams.get("responseId") ?? "";
  const isEditMode = Boolean(editToken && editResponseId);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedule() {
      setIsLoading(true);
      setError(null);

      try {
        const scheduleResponse = await fetch(`/api/schedules/${token}`);
        const publicData = (await scheduleResponse.json()) as PublicSchedule & { error?: string };

        if (!scheduleResponse.ok) {
          throw new Error(publicData.error ?? "일정을 불러오지 못했습니다.");
        }

        const detailsResponse = await fetch(`/api/schedules/${token}/details`);
        const detailsData = (await detailsResponse.json()) as VerifiedScheduleDetails & { error?: string };

        if (!detailsResponse.ok) {
          if (detailsResponse.status === 401 && publicData.isProtected) {
            router.replace(`/s/${token}`);
            return;
          }

          throw new Error(detailsData.error ?? "일정 상세 정보를 불러오지 못했습니다.");
        }

        if (!isMounted) {
          return;
        }

        setSchedule(detailsData);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(requestError instanceof Error ? requestError.message : "일정을 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSchedule();

    return () => {
      isMounted = false;
    };
  }, [router, token]);

  const requiredFieldSummary = useMemo(() => {
    if (!schedule) {
      return "필수 항목을 확인하는 중입니다.";
    }

    const requiredFields = [
      schedule.requireEmail ? "이메일" : null,
      schedule.requirePhone ? "전화번호" : null,
    ].filter(Boolean);

    return requiredFields.length > 0
      ? `현재 일정은 ${requiredFields.join(", ")} 입력이 필수입니다.`
      : "이메일과 전화번호는 선택 입력입니다.";
  }, [schedule]);

  function toggleOption(optionId: number) {
    setSelectedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((value) => value !== optionId)
        : [...current, optionId],
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const endpoint = isEditMode
        ? `/api/schedules/${token}/responses/${editResponseId}`
        : `/api/schedules/${token}/responses`;
      const method = isEditMode ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          comment,
          editToken: isEditMode ? editToken : undefined,
          selectedOptionIds,
        }),
      });

      const data = (await response.json()) as SubmitResult & { error?: string; code?: string };

      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/s/${token}`);
          return;
        }

        if (response.status === 409 || data.code === "DUPLICATE_IDENTIFIER") {
          throw new Error("이미 동일한 이름/연락처로 제출된 응답이 있습니다. 기존 응답 수정 링크를 사용해 주세요.");
        }

        throw new Error(data.error ?? "응답 제출에 실패했습니다.");
      }

      setResult(data);

      if (data.editUrl) {
        router.replace(data.editUrl);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "응답 제출에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f3eb_0%,#efe7dc_100%)] px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-5 shadow-[0_24px_60px_rgba(120,113,108,0.14)] backdrop-blur sm:p-8">
          {isLoading ? <p className="text-sm text-stone-500">응답 폼을 불러오는 중...</p> : null}

          {schedule ? (
            <>
              <div className="border-b border-stone-200 pb-6">
                <p className="text-xs tracking-[0.26em] text-stone-500 uppercase">Instructor response</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] [word-break:keep-all] sm:text-4xl">{schedule.title}</h1>
                <p className="mt-3 text-sm leading-7 text-stone-600 [word-break:keep-all]">{schedule.location}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600 [word-break:keep-all]">비고: {schedule.note}</p>
                <p className="mt-3 text-sm leading-6 text-stone-600 [word-break:keep-all]">{requiredFieldSummary}</p>
                {isEditMode ? (
                  <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    수정 링크로 접속했습니다. 제출 시 새로운 수정 링크로 자동 회전됩니다.
                  </p>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} className="mt-6 grid gap-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 sm:col-span-2">
                    <span className="text-sm font-medium text-stone-700">이름 *</span>
                    <input
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                      placeholder="이름을 입력하세요"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-stone-700">
                      이메일{schedule.requireEmail ? " *" : ""}
                    </span>
                    <input
                      type="email"
                      autoComplete="email"
                      required={schedule.requireEmail}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                      placeholder="you@example.com"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-stone-700">
                      전화번호{schedule.requirePhone ? " *" : ""}
                    </span>
                    <input
                      autoComplete="tel"
                      required={schedule.requirePhone}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="h-12 rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                      placeholder="010-0000-0000"
                    />
                  </label>
                </div>

                <ScheduleOptionCalendar
                  options={schedule.options}
                  selectedOptionIds={selectedOptionIds}
                  onToggle={toggleOption}
                />

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-stone-700">코멘트</span>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    className="rounded-[1.5rem] border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                    placeholder="추가로 전달할 내용이 있으면 남겨주세요"
                  />
                </label>

                {error ? (
                  <div className="rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                {result ? (
                  <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {result.updated ? "응답이 수정되었고, 수정 링크가 갱신되었습니다." : "응답이 정상적으로 제출되었습니다. 수정 링크를 안전하게 보관해 주세요."}
                    {result.editUrl ? (
                      <p className="mt-2 break-all text-xs text-emerald-700">수정 링크: {result.editUrl}</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/s/${token}`} className="text-sm font-medium text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline">
                    비밀번호 페이지로 돌아가기
                  </Link>
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-stone-950 px-6 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  >
                    {isSubmitting ? "제출 중..." : isEditMode ? "응답 수정" : "응답 제출"}
                  </button>
                </div>

                <FounderNudge
                  title="오픈소스 기반으로 운영됩니다"
                  description="현재 응답 경험은 운영 도구의 일부이며, 필요 시 교육 운영 환경에 맞게 확장할 수 있습니다."
                  className="bg-stone-50/80"
                />
              </form>
            </>
          ) : null}

          {!isLoading && !schedule && error ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
