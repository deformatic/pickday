import { NewScheduleFormClient } from "@/app/new/schedule-form-client";

export default function NewSchedulePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#efe7d8_48%,#e7dece_100%)] px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-stone-900/10 bg-stone-950 px-6 py-10 text-stone-50 shadow-[0_30px_80px_rgba(28,25,23,0.18)] sm:px-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-12 lg:py-12">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.24em] text-stone-200 uppercase">
              Pick Day
            </span>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl">
                링크 한 번으로 강사 일정 수집을 끝냅니다.
              </h1>
              <p className="max-w-xl text-sm leading-7 text-stone-300 sm:text-base">
                교육명, 지역, 시간 정보와 후보 일정을 입력하면 참여 링크와 관리자 링크가 즉시 생성됩니다.
                모바일 기준으로 빠르게 입력할 수 있도록 한 화면에 필요한 제어만 배치했습니다.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-sm sm:grid-cols-3 lg:mt-0 lg:grid-cols-1">
            {[
              ["01", "Protected/Public", "참여 비밀번호를 켜면 링크 진입 전에 비밀번호 게이트가 적용됩니다."],
              ["02", "Required fields", "이메일과 전화번호를 일정마다 개별적으로 필수 처리할 수 있습니다."],
              ["03", "Instant share", "생성 직후 참여 링크와 관리자 링크를 바로 복사할 수 있습니다."],
            ].map(([index, title, description]) => (
              <article key={index} className="rounded-[1.5rem] border border-white/10 bg-black/15 p-4">
                <p className="text-xs tracking-[0.3em] text-stone-400 uppercase">{index}</p>
                <h2 className="mt-3 text-lg font-medium text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-300">{description}</p>
              </article>
            ))}
          </div>
        </section>

        <NewScheduleFormClient />
      </div>
    </main>
  );
}
