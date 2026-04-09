"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearProtectedSchedulePassword, setProtectedSchedulePassword } from "@/lib/client/protected-schedule";
import type { PublicSchedule } from "@/types/schedule";

type AccessGateProps = {
  token: string;
};

export function ScheduleAccessGate({ token }: AccessGateProps) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<PublicSchedule | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        clearProtectedSchedulePassword(token);

        if (!data.isProtected) {
          router.replace(`/s/${token}/respond`);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/schedules/${token}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "비밀번호 확인에 실패했습니다.");
      }

      setProtectedSchedulePassword(token, password);
      router.push(`/s/${token}/respond`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "비밀번호 확인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-8 text-stone-50 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_28px_60px_rgba(0,0,0,0.28)] backdrop-blur sm:p-8">
          <p className="text-xs tracking-[0.28em] text-stone-400 uppercase">Protected access</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            일정 참여 전에 비밀번호를 확인합니다.
          </h1>
          <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
            Protected 모드 일정은 참여 비밀번호를 통과한 뒤 응답 폼으로 이동합니다.
          </p>

          {isLoading ? <p className="mt-8 text-sm text-stone-400">일정 정보를 확인하는 중...</p> : null}

          {schedule ? (
            <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs tracking-[0.22em] text-stone-400 uppercase">Schedule</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{schedule.title}</h2>
              <dl className="mt-4 grid gap-3 text-sm text-stone-300 sm:grid-cols-2">
                <div>
                  <dt className="text-stone-400">지역</dt>
                  <dd className="mt-1 text-stone-100">{schedule.location}</dd>
                </div>
                <div>
                  <dt className="text-stone-400">시간 정보</dt>
                  <dd className="mt-1 text-stone-100">{schedule.timeInfo}</dd>
                </div>
              </dl>
            </div>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-stone-50 p-6 text-stone-900 shadow-[0_24px_50px_rgba(0,0,0,0.22)] sm:p-8">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">비밀번호 입력</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            관리자에게 받은 참여 비밀번호를 입력하면 응답 페이지로 이동합니다.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">참여 비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 rounded-2xl border border-stone-300 bg-white px-4 text-sm outline-none transition focus:border-stone-950"
                placeholder="비밀번호를 입력하세요"
              />
            </label>

            {error ? (
              <div className="rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="inline-flex h-12 items-center justify-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSubmitting ? "확인 중..." : "응답 페이지로 이동"}
            </button>
          </form>

          <Link href="/new" className="mt-4 inline-flex text-sm font-medium text-stone-600 underline-offset-4 hover:text-stone-900 hover:underline">
            새 일정 만들러 가기
          </Link>
        </section>
      </div>
    </main>
  );
}
