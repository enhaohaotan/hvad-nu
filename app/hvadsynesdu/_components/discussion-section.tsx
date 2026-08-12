import { DAILY_DISCUSSION } from "../daily-content";
import { EditorialSectionHeader } from "@/app/_components/editorial-section-header";

type DiscussionSectionProps = {
  draft: string;
  onDraftChange: (value: string) => void;
};

export function DiscussionSection({
  draft,
  onDraftChange,
}: DiscussionSectionProps) {
  return (
    <section
      className="mt-12 border-y-4 border-[#0b4a47] pb-10 pt-7 sm:mt-16 sm:pb-14 sm:pt-9"
      aria-labelledby="discussion-title"
    >
      <div id="discussion-title">
        <EditorialSectionHeader
          eyebrow="02 · Dagens samtaleemne"
          title={DAILY_DISCUSSION.title}
          variant="discussion"
        />
      </div>

      <div className="mx-auto max-w-[880px] py-9 sm:py-12">
        <p className="text-[15px] leading-[1.8] text-[#332e27] sm:text-[16px]">
          {DAILY_DISCUSSION.introduction}
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)] lg:gap-16">
          <section aria-labelledby="expressions-title">
          <h3
            id="expressions-title"
            className="border-b border-[#0b4a47]/35 pb-2 text-[9px] font-bold uppercase tracking-[0.18em]"
          >
            Ord og udtryk til diskussionen
          </h3>
          <dl className="divide-y divide-[#0b4a47]/20">
            {DAILY_DISCUSSION.expressions.map(([expression, meaning]) => (
              <div key={expression} className="py-2.5">
                <dt className="editorial-serif text-[17px] leading-5 text-[#263a35]">
                  {expression}
                </dt>
                <dd className="mt-0.5 text-[10px] leading-4 text-[#687a74]">
                  {meaning}
                </dd>
              </div>
            ))}
          </dl>
          </section>

          <section aria-labelledby="questions-title">
          <h3
            id="questions-title"
            className="border-b border-[#0b4a47]/35 pb-3 text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            Spørgsmål
          </h3>
          <ol className="divide-y divide-[#0b4a47]/20">
            {DAILY_DISCUSSION.questions.map((question, index) => (
              <li
                key={question}
                className="grid grid-cols-[1.5rem_1fr] gap-3 py-4 text-sm leading-6 sm:text-base sm:leading-7"
              >
                <span className="font-bold text-[#d9542b]">{index + 1}</span>
                <span>{question}</span>
              </li>
            ))}
          </ol>
          </section>
        </div>

        <div className="mt-10 border-2 border-[#0b4a47] bg-[#eee5d3]">
        <label
          htmlFor="discussion-answer"
          className="block border-b border-[#0b4a47]/35 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#415d56] sm:px-6"
        >
          Skriv dit svar på dansk
        </label>
        <textarea
          id="discussion-answer"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value.slice(0, 3000))}
          rows={10}
          placeholder="Hvad betyder det for dig at høre til? Skriv dine tanker her …"
          className="min-h-64 w-full resize-y bg-transparent px-4 py-5 text-sm leading-6 outline-none placeholder:text-[#7a8983] focus:bg-[#f7f0e2]/55 sm:px-6 sm:text-base sm:leading-7"
        />
        <p className="border-t border-[#0b4a47]/25 px-4 py-3 text-right text-[9px] uppercase tracking-[0.12em] text-[#788781] sm:px-6">
          {draft.length}/3000
        </p>
        </div>
      </div>
    </section>
  );
}
