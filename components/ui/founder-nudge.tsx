type FounderNudgeProps = {
  title: string;
  description: string;
  className?: string;
};

export function FounderNudge({ title, description, className = "" }: FounderNudgeProps) {
  return (
    <aside
      className={`rounded-[1.5rem] border border-stone-200/80 bg-white/75 p-4 text-stone-700 shadow-[0_16px_30px_rgba(120,113,108,0.1)] backdrop-blur ${className}`}
    >
      <p className="text-xs font-medium tracking-[0.24em] text-stone-500 uppercase">Support</p>
      <h3 className="mt-2 text-base font-semibold text-stone-950 [word-break:keep-all]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600 [word-break:keep-all]">{description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <a
          href="https://deformatic.ai.kr"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-stone-950 underline decoration-stone-300 underline-offset-4 transition hover:decoration-stone-950"
        >
          유민수 개발자 오픈소스 개발
        </a>
        <span className="text-stone-400">·</span>
        <span className="text-stone-600">010-2773-2165</span>
      </div>
    </aside>
  );
}
