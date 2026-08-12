"use client";

import { DiscussionSection } from "./_components/discussion-section";
import { ReadingSection } from "./_components/reading-section";
import { SetupSteps } from "./_components/setup-steps";
import { SessionHistory } from "./_components/session-history";
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
            isApiKeySaved={learning.isApiKeySaved}
            profile={learning.profile}
            todayCount={learning.todayCount}
            isGenerating={learning.isGenerating}
            todayLabel={learning.todayLabel}
            onApiKeyChange={learning.updateApiKey}
            onForgetApiKey={learning.forgetApiKey}
            onLevelChange={learning.updateLevel}
            onStart={() => void learning.generateSession()}
          />
          <SessionHistory sessions={learning.history} activeId={session?.id ?? null} onSelect={learning.selectSession} />

          {learning.error && (
            <p role="alert" className="mt-4 border border-[#b23a2b]/45 bg-[#b23a2b]/5 px-4 py-3 text-xs leading-5 text-[#8d2f24]">{learning.error}</p>
          )}

          {session && (
            <>
              <ReadingSection
                apiKey={learning.apiKey}
                reading={session.content.reading}
                isCopied={learning.isReadingCopied}
                onCopy={() => void learning.copyReading()}
                onDownload={learning.downloadReading}
              />
              <DiscussionSection
                discussion={session.content.discussion}
                conversation={session.conversation}
                draft={session.draft}
                isSending={learning.isSending}
                onDraftChange={learning.updateDraft}
                onSend={() => void learning.sendAnswer()}
              />
              <p className="mx-auto max-w-[880px] border-t border-[#29231b]/20 pb-2 pt-3 text-[12px] leading-[1.8] text-[#70695f] sm:text-[13px]">
                Dagens tekst, samtaleemne, udtryk og spørgsmål er genereret af
                AI og kan indeholde fejl.
              </p>
            </>
          )}
        </section>

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
