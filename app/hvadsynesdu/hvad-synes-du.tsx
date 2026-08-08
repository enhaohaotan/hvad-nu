"use client";

import { DiscussionSection } from "./_components/discussion-section";
import { LibraryPanel } from "./_components/library-panel";
import { ReadingSection } from "./_components/reading-section";
import { SetupSteps } from "./_components/setup-steps";
import { ThinkingSection } from "./_components/thinking-section";
import { useLearningSession } from "./use-learning-session";
import {
  ProductFooter,
  ProductHeader,
  ProductHero,
} from "@/app/_components/product-chrome";

export function HvadSynesDu() {
  const learning = useLearningSession();
  const { session } = learning;

  return (
    <main className="discussion-product min-h-screen bg-[#0b4a47] p-2.5 text-[#1d1915] sm:p-5 lg:p-7">
      <div className="editorial-sheet min-h-[calc(100vh-20px)] w-full bg-[#f3eddf] px-5 pb-8 pt-6 shadow-[0_24px_80px_rgba(1,35,34,0.3)] sm:min-h-[calc(100vh-40px)] sm:px-10 sm:pb-10 lg:min-h-[calc(100vh-56px)] lg:px-16 lg:pt-9">
        <ProductHeader
          title="Hva’ synes du?"
          secondaryColor="#4d6e65"
          borderColor="rgba(25,59,54,0.7)"
        />

        <section id="top" className="pt-6 sm:pt-14 lg:pt-16">
          <ProductHero title="Hva’ synes du?">
            Fra det, du forstår, til det, du selv kan sige. Én dansk tekst, én
            samtale og feedback, der følger med videre.
          </ProductHero>
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

        <ProductFooter
          borderColor="rgba(25,59,54,0.7)"
          interactionClassName="hover:text-[#0b4a47] focus-visible:ring-[#0b4a47]/25"
          isCopied={learning.isContactCopied}
          onContact={() => void learning.copyContactEmail()}
        />
      </div>
    </main>
  );
}
