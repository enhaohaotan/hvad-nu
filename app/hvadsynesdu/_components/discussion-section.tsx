import { EditorialSectionHeader } from "@/app/_components/editorial-section-header";
import type { GeneratedContent, LearningSession } from "../types";

type DiscussionSectionProps = {
  discussion: GeneratedContent["discussion"];
  conversation: LearningSession["conversation"];
  draft: string;
  isSending: boolean;
  onDraftChange: (value: string) => void;
  onSend: () => void;
};

export function DiscussionSection({ discussion, conversation, draft, isSending, onDraftChange, onSend }: DiscussionSectionProps) {
  const followUp = conversation.at(-1)?.feedback.followUpQuestion;
  return (
    <section className="mt-10 border-t border-[#0b4a47]/65 pb-10 pt-7 sm:mt-14 sm:pb-14 sm:pt-9" aria-labelledby="discussion-title">
      <div id="discussion-title">
        <EditorialSectionHeader eyebrow="02 · Dagens samtaleemne" title={discussion.title} variant="discussion" />
      </div>

      <div className="mx-auto max-w-[880px] py-9 sm:py-12">
        <div className="space-y-4 text-[15px] leading-[1.8] text-[#332e27] sm:text-[16px]">
          {discussion.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)] lg:gap-16">
          <section aria-labelledby="expressions-title">
            <h3 id="expressions-title" className="border-b border-[#0b4a47]/35 pb-2 text-[9px] font-bold uppercase tracking-[0.18em]">Ord og udtryk til diskussionen</h3>
            <dl className="divide-y divide-[#0b4a47]/20">
              {discussion.expressions.map(({ expression, explanation }) => (
                <div key={expression} className="py-2.5">
                  <dt className="text-sm font-semibold leading-5 text-[#263a35]">{expression}</dt>
                  <dd className="mt-0.5 text-[10px] leading-4 text-[#687a74]">{explanation}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="questions-title">
            <h3 id="questions-title" className="border-b border-[#0b4a47]/35 pb-3 text-[10px] font-bold uppercase tracking-[0.2em]">Spørgsmål</h3>
            <ol className="divide-y divide-[#0b4a47]/20">
              {discussion.questions.map((question, index) => (
                <li key={question} className="grid grid-cols-[1.5rem_1fr] gap-3 py-4 text-sm leading-6 sm:text-base sm:leading-7">
                  <span className="font-bold text-[#d9542b]">{index + 1}</span><span>{question}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {conversation.map((turn, index) => <FeedbackTurn key={turn.id} turn={turn} index={index} />)}

        <div className="mt-10 border-2 border-[#0b4a47] bg-[#eee5d3]">
          <label htmlFor="discussion-answer" className="block border-b border-[#0b4a47]/35 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#415d56] sm:px-6">
            {conversation.length ? "Fortsæt samtalen på dansk" : "Skriv dit svar på dansk"}
          </label>
          {followUp && <p className="border-b border-[#0b4a47]/20 px-4 py-3 text-xs leading-5 text-[#415d56] sm:px-6">{followUp}</p>}
          <textarea
            id="discussion-answer"
            value={draft}
            disabled={isSending}
            onChange={(event) => onDraftChange(event.target.value.slice(0, 6000))}
            rows={9}
            placeholder="Skriv dine tanker her …"
            className="min-h-56 w-full resize-y bg-transparent px-4 py-5 text-sm leading-6 outline-none placeholder:text-[#7a8983] focus:bg-[#f7f0e2]/55 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6 sm:text-base sm:leading-7"
          />
          <div className="flex items-center justify-between border-t border-[#0b4a47]/25">
            <span className="px-4 text-[9px] uppercase tracking-[0.12em] text-[#788781] sm:px-6">{draft.length}/6000</span>
            <button type="button" onClick={onSend} disabled={!draft.trim() || isSending} className="min-h-12 bg-[#0b4a47] px-5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#f8f2e6] enabled:hover:bg-[#083b39] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a47]/30 disabled:cursor-not-allowed disabled:opacity-40">
              {isSending ? "Giver feedback …" : "Send svar →"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeedbackTurn({ turn, index }: { turn: LearningSession["conversation"][number]; index: number }) {
  const { feedback } = turn;
  return (
    <article className="mt-10 border-t border-[#0b4a47]/30 pt-8">
      <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#4d6e65]">Svar {index + 1}</p>
      <p className="mt-3 border-l-2 border-[#0b4a47]/35 pl-4 text-sm leading-7 text-[#554e45]">{turn.userAnswer}</p>
      <p className="mt-6 text-sm leading-7">{feedback.reply}</p>
      {!!feedback.corrections.length && <FeedbackList title="Rettelser" items={feedback.corrections.map((item) => ({ before: item.original, after: item.corrected, explanation: item.explanation, label: item.recurring ? `${item.category} · tilbagevendende` : item.category }))} />}
      {!!feedback.upgrades.length && <FeedbackList title="Sproglige løft" items={feedback.upgrades.map((item) => ({ before: item.original, after: item.improved, explanation: item.explanation, label: item.category }))} />}
      <section className="mt-7 bg-[#0b4a47]/5 p-5">
        <h4 className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#415d56]">En samlet, forbedret version</h4>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{feedback.revisedVersion}</p>
      </section>
    </article>
  );
}

function FeedbackList({ title, items }: { title: string; items: Array<{ before: string; after: string; explanation: string; label: string }> }) {
  return (
    <section className="mt-7">
      <h4 className="border-b border-[#0b4a47]/25 pb-2 text-[9px] font-bold uppercase tracking-[0.16em]">{title}</h4>
      <div className="divide-y divide-[#0b4a47]/15">
        {items.map((item, index) => (
          <div key={`${item.before}-${index}`} className="py-4 text-xs leading-5">
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#4d6e65]">{item.label}</p>
            <p className="mt-1 text-[#746c62] line-through">{item.before}</p>
            <p className="font-semibold text-[#263a35]">{item.after}</p>
            <p className="mt-1 text-[#655e55]">{item.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
