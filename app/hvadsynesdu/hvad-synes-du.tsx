"use client";

import { DiscussionSection } from "./_components/discussion-section";
import { LibraryPanel } from "./_components/library-panel";
import { ReadingSection } from "./_components/reading-section";
import { SetupSteps } from "./_components/setup-steps";
import { ThinkingSection } from "./_components/thinking-section";
import { useLearningSession } from "./use-learning-session";

export function HvadSynesDu() {
  const learning = useLearningSession();
  const { session } = learning;

  return (
    <main className="discussion-product min-h-screen bg-[#0b4a47] p-2.5 text-[#1d1915] sm:p-5 lg:p-7">
      <div className="editorial-sheet min-h-[calc(100vh-20px)] w-full bg-[#f3eddf] px-5 pb-8 pt-6 shadow-[0_24px_80px_rgba(1,35,34,0.3)] sm:min-h-[calc(100vh-40px)] sm:px-10 sm:pb-10 lg:min-h-[calc(100vh-56px)] lg:px-16 lg:pt-9">
        <header className="flex items-center justify-between gap-4 border-b border-[#193b36]/70 pb-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] sm:pb-3 sm:text-xs sm:tracking-[0.18em]">
          <span>Hva’ synes du?</span>
          <span className="text-right text-[#4d6e65]">
            For dem, der stadig siger “hva’?”
          </span>
        </header>

        <section id="top" className="pt-6 sm:pt-14 lg:pt-16">
          <Hero />
          <SetupSteps
            apiKey={learning.apiKey}
            hasLoaded={learning.hasLoaded}
            profile={learning.profile}
            session={session}
            todayLabel={learning.todayLabel}
            onApiKeyChange={learning.saveApiKey}
            onProfileChange={learning.saveProfile}
            onStart={learning.startToday}
          />

          {session && (
            <>
              <ReadingSection
                expressions={learning.expressions}
                onContinue={learning.moveToThinking}
                onSaveExpression={learning.saveExpression}
                progress={learning.progress}
                session={session}
              />
              {session.phase !== "reading" && (
                <ThinkingSection
                  onSaveExpression={learning.saveExpression}
                  onStartDiscussion={learning.startDiscussion}
                  savedExpressionNames={learning.savedExpressionNames}
                  session={session}
                />
              )}
              {(session.phase === "discussing" || session.phase === "feedback") && (
                <DiscussionSection
                  discussionRef={learning.discussionRef}
                  draft={learning.draft}
                  isReplying={learning.isReplying}
                  onComplete={learning.completeSession}
                  onDraftChange={learning.setDraft}
                  onSend={learning.sendMessage}
                  session={session}
                />
              )}
            </>
          )}
        </section>

        {learning.saveNotice && (
          <p
            className="mt-6 border-y border-[#0b4a47]/35 bg-[#0b4a47]/5 px-4 py-3 text-center text-xs font-semibold text-[#0b4a47]"
            role="status"
          >
            {learning.saveNotice}
          </p>
        )}

        <LibraryPanel
          expressions={learning.expressions}
          mistakes={learning.mistakes}
          history={learning.history}
        />

        <footer className="mt-14 flex items-center justify-between gap-4 border-t border-[#193b36]/70 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#575147]">
          <address className="not-italic">
            <button
              type="button"
              onClick={() => void learning.copyContactEmail()}
              className="cursor-pointer uppercase underline decoration-current/35 underline-offset-4 transition hover:text-[#0b4a47] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a47]/25"
            >
              {learning.isContactCopied ? "E-MAIL KOPIERET" : "KONTAKT"}
            </button>
          </address>
          <span>© 2026 Enhao Tan</span>
        </footer>
      </div>
    </main>
  );
}

function Hero() {
  return (
    <div className="w-full">
      <h1 className="editorial-serif text-[clamp(3rem,13vw,4.75rem)] uppercase leading-[0.86] tracking-[-0.06em] sm:text-[clamp(5rem,8vw,8.5rem)] sm:leading-[0.82] sm:tracking-[-0.065em]">
        Hva’ synes du?
      </h1>
      <p className="editorial-serif mt-5 w-full text-[13px] leading-5 text-[#4b463f] sm:mt-7 sm:text-base sm:leading-7">
        Fra det, du forstår, til det, du selv kan sige. Én dansk tekst, én
        samtale og feedback, der følger med videre.
      </p>
    </div>
  );
}
