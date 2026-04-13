"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AdminAccessFormProps = {
  adminToken: string;
};

export function AdminAccessForm({ adminToken }: AdminAccessFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/${adminToken}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "관리자 인증에 실패했습니다.");
      }

      router.push(`/admin/${adminToken}/dashboard`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "관리자 인증에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 px-4 py-8 text-stone-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_30px_70px_rgba(0,0,0,0.28)] backdrop-blur sm:p-8">
        <p className="text-xs tracking-[0.28em] text-stone-400 uppercase">Admin access</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">관리자 비밀번호를 입력하세요.</h1>
        <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
          인증 성공 시 짧은 만료 시간의 보안 토큰이 발급되어 대시보드 API 요청에 자동으로 사용됩니다.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-stone-200">관리자 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-2xl border border-white/15 bg-black/20 px-4 text-sm text-white outline-none transition focus:border-amber-300"
              placeholder="관리자 비밀번호"
            />
          </label>

          {error ? (
            <div className="rounded-[1.4rem] border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center rounded-full bg-amber-300 px-5 text-sm font-semibold text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {isSubmitting ? "확인 중..." : "대시보드 열기"}
          </button>
        </form>
      </div>
    </main>
  );
}
