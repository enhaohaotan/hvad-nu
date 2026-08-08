import type { RefObject } from "react";
import type { LearningSession } from "../types";

type DiscussionSectionProps = {
  discussionRef: RefObject<HTMLElement | null>;
  draft: string;
  isReplying: boolean;
  onComplete: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  session: LearningSession;
};

export function DiscussionSection({
  discussionRef,
  draft,
  isReplying,
  onComplete,
  onDraftChange,
  onSend,
  session,
}: DiscussionSectionProps) {
  return (
    <section
      ref={discussionRef}
      className="scroll-mt-5 border-b-2 border-[#0b4a47] py-10 sm:py-14"
      aria-label="Skriftlig diskussion"
    >
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d9542b]">03 · Diskutér</p>
          <h2 className="editorial-serif mt-2 text-4xl tracking-[-0.035em] sm:text-5xl">Samtalen</h2>
        </div>
        <p className="max-w-sm text-xs leading-5 text-[#65766f] sm:text-right">
          Dette er en lokal MVP-demo. Svarene er forudbestemte og sendes ikke
          til en AI.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="border-2 border-[#0b4a47] bg-[#eee5d3]">
          <div className="min-h-80 space-y-6 p-4 sm:p-7" aria-live="polite">
            {session.messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] ${message.role === "user" ? "bg-[#0b4a47] text-[#fff8e9]" : "border-l-2 border-[#d9542b] bg-[#f7f0e2]"} px-4 py-3 sm:max-w-[76%] sm:px-5 sm:py-4`}>
                  <p className={`mb-2 text-[9px] font-bold uppercase tracking-[0.18em] ${message.role === "user" ? "text-[#b9d1c9]" : "text-[#d9542b]"}`}>
                    {message.role === "user" ? "Dig" : "Din samtalepartner"}
                  </p>
                  <p className="text-sm leading-6 sm:text-base sm:leading-7">{message.text}</p>
                  {message.question && <p className="editorial-serif mt-3 text-xl leading-7">{message.question}</p>}
                </div>
              </div>
            ))}
            {isReplying && (
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6d7c77]">Din samtalepartner tænker …</p>
            )}
          </div>

          <div className="border-t-2 border-[#0b4a47] p-3 sm:p-4">
            <label className="sr-only" htmlFor="discussion-answer">Skriv dit svar på dansk</label>
            <textarea
              id="discussion-answer"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value.slice(0, 1200))}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onSend();
              }}
              rows={4}
              placeholder={`Skriv på dansk …\nDu kan fx begynde: “${session.questionIndex === 0 ? "Jeg synes, det er rimeligt, når …" : "Det afgørende er, om …"}”`}
              className="w-full resize-none bg-transparent p-2 text-sm leading-6 outline-none placeholder:text-[#7a8983] sm:text-base"
            />
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#0b4a47]/25 pt-3">
              <span className="text-[9px] uppercase tracking-[0.12em] text-[#788781]">{draft.length}/1200 · ⌘ Enter</span>
              <button
                type="button"
                onClick={onSend}
                disabled={!draft.trim() || isReplying}
                className="bg-[#0b4a47] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f8f2e6] transition enabled:hover:bg-[#083b39] disabled:opacity-40"
              >
                Send svar →
              </button>
            </div>
          </div>
        </div>

        <aside className="border-t-2 border-[#d9542b] pt-5 xl:border-l xl:border-t-0 xl:border-[#0b4a47]/35 xl:pl-7 xl:pt-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#d9542b]">Selektiv feedback</p>
          {session.phase === "feedback" ? (
            <div className="mt-4 space-y-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#667871]">Det virker allerede</p>
                <p className="mt-2 text-sm leading-6">Du gør dit synspunkt konkret og får begge sider af situationen med.</p>
              </div>
              <div className="border-y border-[#0b4a47]/25 py-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#667871]">Et sprogligt løft</p>
                <p className="editorial-serif mt-2 text-xl leading-7 text-[#b84424]">“Det afgørende er, om …”</p>
                <p className="mt-2 text-xs leading-5 text-[#65766f]">Brug vendingen til at gøre dit vigtigste kriterium tydeligt.</p>
              </div>
              <button
                type="button"
                onClick={onComplete}
                className="w-full border-2 border-[#0b4a47] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.14em] transition hover:bg-[#0b4a47] hover:text-white"
              >
                Gem dagens læring ✓
              </button>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-[#66766f]">Jeg retter kun det, der er vigtigt for at gøre dit dansk klarere og mere naturligt.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
