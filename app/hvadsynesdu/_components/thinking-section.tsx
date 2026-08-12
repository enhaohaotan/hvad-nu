import { DISCUSSION_EXPRESSIONS, QUESTIONS } from "../constants";
import type { LearningSession } from "../types";

type ThinkingSectionProps = {
  onStartDiscussion: () => void;
  session: LearningSession;
};

export function ThinkingSection({
  onStartDiscussion,
  session,
}: ThinkingSectionProps) {
  return (
    <section
      id="samtalestart"
      className="scroll-mt-5 border-b-2 border-[#0b4a47] py-10 sm:py-14"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(20rem,1.22fr)] lg:gap-16">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d9542b]">02 · Tænk før du svarer</p>
          <h2 className="editorial-serif mt-3 text-4xl leading-none tracking-[-0.035em] sm:text-5xl">Hvem bestemmer over stilheden?</h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-[#526760] sm:text-base sm:leading-7">
            Overvej, om problemet bedst løses med regler eller med mere hensyn.
            Du må gerne være i tvivl — det giver ofte den bedste samtale.
          </p>
          <ol className="mt-7 space-y-4">
            {QUESTIONS.map((question, index) => (
              <li key={question} className="grid grid-cols-[1.5rem_1fr] gap-3 border-t border-[#0b4a47]/25 pt-3 text-sm leading-6">
                <span className="font-bold text-[#d9542b]">{index + 1}</span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-y border-[#0b4a47]/45 bg-[#eee6d7]/55 p-5 sm:p-8 lg:border">
          <div className="flex items-center justify-between gap-4 border-b border-[#0b4a47]/35 pb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">Vendinger til samtalen</h3>
          </div>
          <div className="divide-y divide-[#0b4a47]/20">
            {DISCUSSION_EXPRESSIONS.map(([expression, meaning]) => (
              <div
                key={expression}
                className="grid w-full gap-1 py-4 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-5"
              >
                <span className="editorial-serif text-xl leading-6">{expression}</span>
                <span className="text-[10px] leading-4 text-[#687a74] sm:max-w-44 sm:text-right">
                  {meaning}
                </span>
              </div>
            ))}
          </div>
          {session.phase === "thinking" && (
            <button
              type="button"
              onClick={onStartDiscussion}
              className="mt-6 flex min-h-[54px] w-full items-center justify-between bg-[#0b4a47] px-5 text-xs font-semibold uppercase tracking-[0.15em] text-[#f8f2e6] transition hover:bg-[#083b39] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a47]/30"
            >
              <span>Start samtalen</span><span className="text-lg" aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
