"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getProtectedSchedulePassword } from "@/lib/client/protected-schedule";
import { formatScheduleOptionTitle, formatScheduleOptionWindow } from "@/lib/schedule-options";
import type { PublicSchedule } from "@/types/schedule";

type ScheduleResponseFormProps = {
  token: string;
};

type InstructorSuggestion = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
};

type SubmitResult = {
  responseId: number;
  updated: boolean;
};

export function ScheduleResponseForm({ token }: ScheduleResponseFormProps) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [suggestions, setSuggestions] = useState<InstructorSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSchedule() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/schedules/${token}`);
        const data = (await response.json()) as PublicSchedule & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "일정을 불러오지 못했습니다.");
        }

        if (!isMounted) {
          return;
        }

        setSchedule(data);

        if (data.isProtected && !getProtectedSchedulePassword(token)) {
          router.replace(`/s/${token}`);
        }
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

  useEffect(() => {
    let isMounted = true;

    async function loadSuggestions() {
      if (name.trim().length < 2) {
        setSuggestions([]);
        setIsLoadingSuggestions(false);
        return;
      }

      setIsLoadingSuggestions(true);

      try {
        const response = await fetch(`/api/instructors/autocomplete?q=${encodeURIComponent(name.trim())}`);
        const data = (await response.json()) as InstructorSuggestion[] | { error?: string };

        if (!response.ok) {
          throw new Error("자동완성 목록을 불러오지 못했습니다.");
        }

        if (isMounted && Array.isArray(data)) {
          setSuggestions(data);
        }
      } catch {
        if (isMounted) {
          setSuggestions([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSuggestions(false);
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadSuggestions();
    }, 180);

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [name]);

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

  function applySuggestion(suggestion: InstructorSuggestion) {
    setName(suggestion.name);
    setEmail(suggestion.email ?? "");
    setPhone(suggestion.phone ?? "");
    setSuggestions([]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/schedules/${token}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          comment,
          accessPassword: schedule?.isProtected ? getProtectedSchedulePassword(token) ?? undefined : undefined,
          selectedOptionIds,
        }),
      });

      const data = (await response.json()) as SubmitResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "응답 제출에 실패했습니다.");
      }

      setResult(data);
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
              </div>

              <form onSubmit={handleSubmit} className="mt-6 grid gap-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 sm:col-span-2">
                    <span className="text-sm font-medium text-stone-700">이름 *</span>
                    <div className="relative">
                      <input
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="h-12 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                        placeholder="이름을 입력하세요"
                      />

                      {name.trim().length >= 2 ? (
                        <div className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-10 overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-[0_18px_30px_rgba(28,25,23,0.12)]">
                          {isLoadingSuggestions ? (
                            <p className="px-4 py-3 text-sm text-stone-500">자동완성 검색 중...</p>
                          ) : suggestions.length > 0 ? (
                            <ul className="divide-y divide-stone-100">
                              {suggestions.map((suggestion) => (
                                <li key={suggestion.id}>
                                  <button
                                    type="button"
                                    onClick={() => applySuggestion(suggestion)}
                                    className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-stone-50"
                                  >
                                    <span className="text-sm font-semibold text-stone-900">{suggestion.name}</span>
                                    <span className="text-xs text-stone-500">
                                      {suggestion.email ?? "이메일 없음"} · {suggestion.phone ?? "전화번호 없음"}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="px-4 py-3 text-sm text-stone-500">검색 결과가 없습니다.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
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

                <section className="rounded-[1.75rem] border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-stone-950">가능 일정 *</h2>
                      <p className="mt-1 text-sm text-stone-600 [word-break:keep-all]">복수 선택할 수 있습니다. 터치하기 쉽게 카드 크기를 넉넉하게 잡았습니다.</p>
                    </div>
                    <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-stone-50">
                      {selectedOptionIds.length}개 선택
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {schedule.options.map((option) => {
                      const checked = selectedOptionIds.includes(option.id);

                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleOption(option.id)}
                          className={`flex w-full items-start gap-4 rounded-[1.4rem] border p-4 text-left transition ${
                            checked
                              ? "border-stone-950 bg-stone-950 text-stone-50 shadow-[0_18px_32px_rgba(28,25,23,0.2)]"
                              : "border-stone-300 bg-white text-stone-900 hover:border-stone-500"
                          }`}
                        >
                          <span className={`mt-1 inline-flex h-6 w-6 shrink-0 rounded-full border ${checked ? "border-amber-300 bg-amber-300" : "border-stone-400"}`}>
                            <span className={`m-auto h-2.5 w-2.5 rounded-full ${checked ? "bg-stone-950" : "bg-transparent"}`} />
                          </span>
                          <span>
                            <span className="block text-base font-semibold [word-break:keep-all]">
                              {formatScheduleOptionTitle(option)}
                            </span>
                            <span className={`mt-1 block text-sm ${checked ? "text-stone-300" : "text-stone-600"}`}>
                              {formatScheduleOptionWindow(option)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

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
                    {result.updated ? "기존 응답을 최신 내용으로 수정했습니다." : "응답이 정상적으로 제출되었습니다."}
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
                    {isSubmitting ? "제출 중..." : "응답 제출"}
                  </button>
                </div>
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
