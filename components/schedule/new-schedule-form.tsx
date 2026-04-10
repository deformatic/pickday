"use client";

import { useMemo, useState } from "react";

type ScheduleOption = {
  id: string;
  startAt: string;
  endAt: string;
  note: string;
};

type SuccessPayload = {
  scheduleToken: string;
  adminToken: string;
  participantUrl: string;
  adminUrl: string;
};

type FormState = {
  title: string;
  location: string;
  note: string;
  adminPassword: string;
  accessPassword: string;
  isProtected: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  options: ScheduleOption[];
};

function createInitialFormState(): FormState {
  return {
    title: "",
    location: "",
    note: "",
    adminPassword: "",
    accessPassword: "",
    isProtected: false,
    requireEmail: false,
    requirePhone: false,
    options: [{ id: "1", startAt: "", endAt: "", note: "" }],
  };
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M10 4.166v11.668M4.166 10h11.668"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M10 2.916 4.583 5v4.688c0 3.438 2.23 6.51 5.417 7.396 3.187-.885 5.417-3.958 5.417-7.396V5L10 2.916Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="m10 2.917 1.45 3.966 3.967 1.45-3.967 1.45L10 13.75l-1.45-3.967-3.967-1.45 3.967-1.45L10 2.917Zm5 9.166.725 1.984 1.984.725-1.984.725L15 17.5l-.725-1.983-1.983-.725 1.983-.725L15 12.083ZM5 12.917l.725 1.983 1.983.725-1.983.725L5 18.333l-.725-1.983-1.983-.725 1.983-.725L5 12.917Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M6.667 5V4.167c0-.92.746-1.667 1.666-1.667h3.334c.92 0 1.666.746 1.666 1.667V5m-8.75 0h10.834m-9.584 0 .625 9.166c.06.884.794 1.572 1.68 1.572h3.056c.887 0 1.62-.688 1.68-1.572L14.167 5M8.75 8.333v4.584m2.5-4.584v4.584"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ToggleCard({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start justify-between gap-4 rounded-[1.4rem] border px-4 py-4 text-left transition ${
        checked
          ? "border-stone-950 bg-stone-950 text-stone-50 shadow-[0_18px_36px_rgba(28,25,23,0.18)]"
          : "border-stone-300 bg-stone-50 text-stone-900 hover:border-stone-400"
      }`}
    >
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className={`mt-1 text-sm leading-6 ${checked ? "text-stone-300" : "text-stone-600"}`}>
          {description}
        </p>
      </div>
      <span
        className={`mt-1 inline-flex h-6 w-11 shrink-0 rounded-full p-1 transition ${
          checked ? "bg-amber-300/90" : "bg-stone-300"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </span>
    </button>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
    >
      {copied ? "복사됨" : "링크 복사"}
    </button>
  );
}

export function NewScheduleForm() {
  const [form, setForm] = useState<FormState>(() => createInitialFormState());
  const [nextOptionId, setNextOptionId] = useState(2);
  const [success, setSuccess] = useState<SuccessPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const optionCountLabel = useMemo(() => `${form.options.length}개 일정 후보`, [form.options.length]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateOption(id: string, key: keyof Omit<ScheduleOption, "id">, value: string) {
    setForm((current) => ({
      ...current,
      options: current.options.map((option) =>
        option.id === id ? { ...option, [key]: value } : option,
      ),
    }));
  }

  function addOption() {
    setForm((current) => ({
      ...current,
      options: [...current.options, { id: String(nextOptionId), startAt: "", endAt: "", note: "" }],
    }));
    setNextOptionId((current) => current + 1);
  }

  function removeOption(id: string) {
    setForm((current) => ({
      ...current,
      options: current.options.length === 1
        ? current.options
        : current.options.filter((option) => option.id !== id),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          location: form.location,
          note: form.note,
          adminPassword: form.adminPassword,
          accessPassword: form.isProtected ? form.accessPassword : undefined,
          requireEmail: form.requireEmail,
          requirePhone: form.requirePhone,
          options: form.options.map(({ startAt, endAt, note }) => ({ startAt, endAt, note })),
        }),
      });

      const data = (await response.json()) as Partial<SuccessPayload> & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "일정 생성에 실패했습니다.");
      }

      setSuccess({
        scheduleToken: data.scheduleToken ?? "",
        adminToken: data.adminToken ?? "",
        participantUrl: data.participantUrl ?? "",
        adminUrl: data.adminUrl ?? "",
      });
      setForm(createInitialFormState());
      setNextOptionId(2);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "일정 생성 중 알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <form
        onSubmit={handleSubmit}
        className="rounded-[2rem] border border-stone-900/10 bg-white/80 p-5 shadow-[0_28px_60px_rgba(120,113,108,0.14)] backdrop-blur sm:p-6 lg:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-6">
          <div>
            <p className="text-xs font-medium tracking-[0.25em] text-stone-500 uppercase">Schedule creation</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-stone-950 [word-break:keep-all] sm:text-3xl">
                일정 생성
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600 [word-break:keep-all]">
                후보 일정, 접근 방식, 필수 수집 항목을 한 번에 설정하세요.
              </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/70 px-3 py-2 text-xs font-medium text-amber-950">
            <SparklesIcon />
            {optionCountLabel}
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-medium text-stone-700">교육명</span>
                <input
                  required
                  autoComplete="organization-title"
                  value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="h-12 rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                placeholder="예: 2026 봄학기 강사 OT"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">지역</span>
                <input
                  required
                  autoComplete="address-level2"
                  value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                className="h-12 rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                placeholder="예: 서울 강남"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-stone-700">비고</span>
              <textarea
                required
                autoComplete="off"
                rows={3}
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                className="rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                placeholder="예: 오전반 강의, 점심 포함, 주차 가능 여부 등"
              />
            </label>
          </div>

          <section className="rounded-[1.75rem] border border-stone-200 bg-stone-50/80 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-stone-950">일정 후보</h3>
                <p className="mt-1 text-sm text-stone-600 [word-break:keep-all]">최소 1개 이상 필요합니다. 캘린더 기준으로 시작 시간과 마감 시간을 추가하세요.</p>
              </div>
              <button
                type="button"
                onClick={addOption}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-stone-900/10 bg-white px-4 text-sm font-medium text-stone-900 shadow-sm transition hover:border-stone-950"
              >
                <PlusIcon /> 후보 추가
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {form.options.map((option, index) => (
                <div
                  key={option.id}
                  className="grid gap-3 rounded-[1.5rem] border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_1fr]"
                >
                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-stone-700">캘린더 일정 시작 시간</span>
                    <input
                      type="datetime-local"
                      autoComplete="off"
                      required
                      value={option.startAt}
                      onChange={(event) => updateOption(option.id, "startAt", event.target.value)}
                      className="h-11 rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-stone-700">캘린더 일정 마감 시간</span>
                    <input
                      type="datetime-local"
                      required
                      autoComplete="off"
                      min={option.startAt || undefined}
                      value={option.endAt}
                      onChange={(event) => updateOption(option.id, "endAt", event.target.value)}
                      className="h-11 rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                    />
                  </label>

                  <label className="grid gap-2 sm:col-span-2">
                    <span className="text-sm font-medium text-stone-700">비고</span>
                    <div className="flex gap-3">
                      <textarea
                        rows={3}
                        autoComplete="off"
                        value={option.note}
                        onChange={(event) => updateOption(option.id, "note", event.target.value)}
                        className="min-h-24 flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                        placeholder="예: 1교시 수업 직후 가능, 오후 회의 전까지 가능 등"
                      />

                      <button
                        type="button"
                        onClick={() => removeOption(option.id)}
                        disabled={form.options.length === 1}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-2xl border border-stone-300 text-stone-700 transition hover:border-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`후보 ${index + 1} 삭제`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 rounded-[1.75rem] border border-stone-200 bg-white p-4 sm:p-5">
            <div className="flex items-center gap-3 text-stone-950">
              <div className="rounded-2xl bg-stone-950 p-2 text-stone-50">
                <ShieldIcon />
              </div>
              <div>
                <h3 className="text-lg font-semibold [word-break:keep-all]">접근 및 수집 설정</h3>
                <p className="text-sm text-stone-600 [word-break:keep-all]">일정별 접근 방식과 필수 수집 항목을 선택하세요.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <ToggleCard
                checked={form.isProtected}
                onChange={(value) => updateField("isProtected", value)}
                label="Protected 모드"
                description="참여 링크 진입 전에 비밀번호를 확인합니다. Public 모드면 즉시 응답 폼으로 이동합니다."
              />
              <ToggleCard
                checked={form.requireEmail}
                onChange={(value) => updateField("requireEmail", value)}
                label="이메일 필수"
                description="응답 폼에서 이메일 입력에 * 표시와 필수 검증을 적용합니다."
              />
              <ToggleCard
                checked={form.requirePhone}
                onChange={(value) => updateField("requirePhone", value)}
                label="전화번호 필수"
                description="응답 폼에서 전화번호 입력에 * 표시와 필수 검증을 적용합니다."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-stone-700">관리자 비밀번호</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.adminPassword}
                  onChange={(event) => updateField("adminPassword", event.target.value)}
                  className="h-12 rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                  placeholder="항상 필수"
                />
              </label>

              {form.isProtected ? (
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-stone-700">참여 비밀번호</span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required={form.isProtected}
                    value={form.accessPassword}
                    onChange={(event) => updateField("accessPassword", event.target.value)}
                    className="h-12 rounded-2xl border border-stone-300 bg-stone-50 px-4 text-sm outline-none transition focus:border-stone-950 focus:bg-white"
                    placeholder="Protected 모드에서만 사용"
                  />
                </label>
              ) : (
                <div className="flex min-h-12 items-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 text-sm text-stone-500">
                  Public 모드에서는 참여 비밀번호 없이 바로 접근합니다.
                </div>
              )}
            </div>
          </section>

          {error ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-stone-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-stone-600 [word-break:keep-all]">
              생성 후 참여 링크와 관리자 링크를 즉시 복사할 수 있습니다.
            </p>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 items-center justify-center rounded-full bg-stone-950 px-6 text-sm font-semibold text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSubmitting ? "생성 중..." : "일정 생성하기"}
            </button>
          </div>
        </div>
      </form>

      <aside className="grid gap-6">
        <section className="rounded-[2rem] border border-stone-900/10 bg-white/75 p-5 shadow-[0_24px_50px_rgba(120,113,108,0.12)] backdrop-blur sm:p-6">
          <p className="text-xs font-medium tracking-[0.28em] text-stone-500 uppercase">Preview</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-stone-950 [word-break:keep-all]">생성 완료 상태</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600 [word-break:keep-all]">
            실제 성공 시 아래 카드에 참여 링크와 관리자 링크가 채워집니다. 운영 중에는 링크를 복사해서 메시지로 바로 공유하면 됩니다.
          </p>

          <div className="mt-5 grid gap-4">
            {success ? (
              <>
                <div className="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">생성 완료</p>
                  <p className="mt-1 text-sm text-emerald-700">링크를 복사해 바로 공유하세요.</p>
                </div>

                {[
                  ["참여 링크", success.participantUrl],
                  ["관리자 링크", success.adminUrl],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.6rem] border border-stone-200 bg-stone-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{label}</p>
                        <p className="mt-1 break-all text-sm leading-6 text-stone-600">{value}</p>
                      </div>
                      <CopyButton value={value} />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="rounded-[1.6rem] border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                아직 생성된 링크가 없습니다. 폼을 제출하면 이 영역에 성공 상태와 복사 버튼이 표시됩니다.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] border border-stone-900/10 bg-stone-950 p-5 text-stone-50 shadow-[0_30px_60px_rgba(41,37,36,0.18)] sm:p-6">
          <p className="text-xs font-medium tracking-[0.28em] text-stone-400 uppercase">Flow notes</p>
          <div className="mt-4 grid gap-4">
            {[
              "Protected 모드가 켜지면 참여 비밀번호 필드가 즉시 노출됩니다.",
              "후보 일정은 입력 블록 단위로 추가/삭제할 수 있습니다.",
              "API 오류가 나면 페이지 내 에러 배너로 즉시 표시됩니다.",
            ].map((item) => (
              <div key={item} className="rounded-[1.4rem] border border-white/10 bg-white/6 px-4 py-3 text-sm leading-6 text-stone-300 [word-break:keep-all]">
                {item}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </section>
  );
}
