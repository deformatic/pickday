import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-stone-950 px-4 py-8 text-stone-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_30px_70px_rgba(0,0,0,0.28)] backdrop-blur sm:p-8">
        <p className="text-xs tracking-[0.28em] text-stone-400 uppercase">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">유효하지 않은 링크입니다.</h1>
        <p className="mt-3 text-sm leading-7 text-stone-300 sm:text-base">
          일정 링크 또는 관리자 링크가 잘못되었거나 더 이상 사용할 수 없습니다.
        </p>
        <Link href="/new" className="mt-6 inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-200">
          새 일정 만들기
        </Link>
      </div>
    </main>
  );
}
