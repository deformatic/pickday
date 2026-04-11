import Link from "next/link";

import { FounderNudge } from "@/components/ui/founder-nudge";

const featureCards = [
  {
    title: "Protected / Public",
    description: "참여 비밀번호 게이트를 켜거나 바로 응답받는 공개 링크로 운영할 수 있습니다.",
  },
  {
    title: "Instructor response",
    description: "강사는 모바일에서 빠르게 후보 일정을 체크하고 이름·연락처를 바로 제출할 수 있습니다.",
  },
  {
    title: "Admin dashboard",
    description: "응답 집계와 강사 배정을 한 화면에서 확인하고 즉시 결정할 수 있습니다.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5f1e8_0%,#efe7d8_48%,#e7dece_100%)] px-4 py-6 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-stone-900/10 bg-stone-950 px-6 py-10 text-stone-50 shadow-[0_30px_80px_rgba(28,25,23,0.18)] sm:px-10 lg:grid lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:px-12 lg:py-12">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.24em] text-stone-200 uppercase">
              Pick Day
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-balance [word-break:keep-all] sm:text-5xl lg:text-6xl">
                강사 일정 조율을 링크 하나로 끝내는 배정 보드.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-stone-300 [word-break:keep-all] sm:text-base">
                일정 후보를 만들고, 참여 링크를 공유하고, 관리자 대시보드에서 응답 집계와 배정까지
                한 번에 처리합니다. 메신저 왕복 없이 실제 배포된 프로덕션 흐름으로 바로 사용할 수 있습니다.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-3 sm:flex-row">
              <Link
                href="/new"
                className="inline-flex h-12 items-center justify-center rounded-full bg-amber-300 px-6 text-sm font-semibold text-stone-950 transition hover:bg-amber-200"
              >
                새 일정 만들기
              </Link>
              <a
                href="https://github.com/deformatic/pickday"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/8 px-6 text-sm font-medium text-stone-100 transition hover:bg-white/12"
              >
                GitHub 보기
              </a>
            </div>
          </div>

          <div className="mt-8 grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/6 p-5 backdrop-blur-sm lg:mt-0">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
              <p className="text-xs tracking-[0.3em] text-stone-400 uppercase">Flow</p>
              <ol className="mt-4 grid gap-3 text-sm text-stone-200">
                <li>1. 일정 후보 생성</li>
                <li>2. 참여 링크 공유</li>
                <li>3. 응답 수집 및 집계</li>
                <li>4. 관리자 배정 확정</li>
              </ol>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-black/15 p-5">
              <p className="text-xs tracking-[0.3em] text-stone-400 uppercase">Live status</p>
              <p className="mt-3 text-lg font-medium text-white">Production deployed</p>
              <p className="mt-2 text-sm leading-6 text-stone-300 [word-break:keep-all]">
                `pickday.vercel.app` 에서 생성 → 응답 → 관리자 배정 흐름까지 실제 검증을 마친 상태입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[1.75rem] border border-stone-200 bg-white/80 p-5 shadow-[0_18px_36px_rgba(120,113,108,0.12)] backdrop-blur"
            >
              <h2 className="text-lg font-semibold text-stone-950">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600 [word-break:keep-all]">{card.description}</p>
            </article>
          ))}
        </section>

        <FounderNudge
          title="교육 운영 맞춤 개발 문의"
          description="교육업체 운영 흐름에 맞춘 기능 확장이나 기관별 커스터마이징이 필요하면 오픈소스 기반으로 빠르게 도와드릴 수 있습니다."
        />
      </div>
    </main>
  );
}
