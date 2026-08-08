import { StepLabel } from "@/app/_components/step-label";
import type { LearnerProfile, LearningSession } from "../types";

type SetupStepsProps = {
  apiKey: string;
  hasLoaded: boolean;
  profile: LearnerProfile;
  session: LearningSession | null;
  todayLabel: string;
  onApiKeyChange: (value: string) => void;
  onProfileChange: (profile: LearnerProfile) => void;
  onStart: () => void;
};

export function SetupSteps({
  apiKey,
  hasLoaded,
  profile,
  session,
  todayLabel,
  onApiKeyChange,
  onProfileChange,
  onStart,
}: SetupStepsProps) {
  return (
    <section
      className="mt-6 border-y-2 border-[#0b4a47] sm:mt-10"
      aria-label="Indstil og opret dagens session"
    >
      <div className="grid lg:grid-cols-[190px_1fr]">
        <div className="border-b border-[#0b4a47]/35 py-5 lg:border-b-0 lg:border-r lg:pr-8">
          <StepLabel number="01" label="Gem din API-nøgle" accent="#0b4a47" />
        </div>
        <div className="py-7 sm:py-9 lg:pl-8">
          <ApiKeyField apiKey={apiKey} onChange={onApiKeyChange} />
        </div>
      </div>

      <div
        className="grid border-t border-[#0b4a47]/45 lg:grid-cols-[190px_1fr]"
        aria-label="Opret dagens session"
      >
        <div className="border-b border-[#0b4a47]/35 py-5 lg:border-b-0 lg:border-r lg:pr-8">
          <StepLabel number="02" label="Opret dagens session" accent="#0b4a47" />
        </div>
        <div className="py-7 sm:py-9 lg:pl-8">
          <label className="block border-b border-[#29231b]/20 pb-7">
            <span className="editorial-serif block text-xl">Dit danske niveau</span>
            <select
              value={profile.level}
              onChange={(event) =>
                onProfileChange({
                  level: event.target.value,
                  updatedAt: profile.updatedAt,
                })
              }
              className="mt-3 min-h-13 w-full border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 text-[15px] outline-none transition focus:border-[#0b4a47] focus:ring-2 focus:ring-[#0b4a47]/15"
            >
              <option>B1</option>
              <option>B2</option>
              <option>C1</option>
              <option>C2</option>
            </select>
            <span className="mt-2 block text-xs leading-5 text-[#6b655b]">
              Niveauet gemmes automatisk i denne browser.
            </span>
          </label>
          <p className="capitalize text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4d6e65]">
            <span className="mt-7 block">{todayLabel} · ca. 25 minutter</span>
          </p>
          <h2 className="editorial-serif mt-4 text-3xl leading-none tracking-[-0.025em] sm:text-4xl">
            Har du noget at sige i dag?
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#50625d] sm:text-base sm:leading-7">
            Vi finder en tekst og bygger en samtale omkring den. Ingen perfekt
            dansk påkrævet — kun din mening.
          </p>
          <button
            type="button"
            onClick={onStart}
            disabled={!hasLoaded || !apiKey.trim()}
            className="mt-6 flex min-h-[64px] w-full items-center justify-between bg-[#0b4a47] px-6 text-xs font-semibold uppercase tracking-[0.15em] text-[#f8f2e6] transition enabled:hover:bg-[#083b39] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a47]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>{session ? "Åbn dagens session" : "Opret dagens session"}</span>
            <span className="text-lg" aria-hidden="true">→</span>
          </button>
          {!apiKey && hasLoaded && (
            <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#70847e]">
              Gem din API-nøgle i trin 01 for at fortsætte
            </p>
          )}
          <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#70847e]">
            MVP-demo · intet API-kald
          </p>
        </div>
      </div>
    </section>
  );
}

function ApiKeyField({
  apiKey,
  onChange,
}: {
  apiKey: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-t border-[#29231b]/20 pt-6">
      <div className="flex items-end justify-between gap-4">
        <p className="editorial-serif text-xl">OpenAI API-nøgle</p>
        {apiKey && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b655b] underline underline-offset-4 hover:text-[#0b4a47] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a47]/25"
          >
            Fjern nøgle
          </button>
        )}
      </div>
      {apiKey ? (
        <p className="mt-3 border border-[#0b4a47]/40 bg-[#0b4a47]/5 px-4 py-3 text-xs font-semibold text-[#425f57]">
          API-nøglen er gemt i denne browser
        </p>
      ) : (
        <>
          <label htmlFor="learning-api-key" className="sr-only">OpenAI API-nøgle</label>
          <input
            id="learning-api-key"
            type="password"
            value={apiKey}
            onChange={(event) => onChange(event.target.value)}
            placeholder="sk-…"
            autoComplete="off"
            spellCheck={false}
            className="mt-3 min-h-13 w-full border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 font-mono text-[15px] outline-none transition placeholder:text-[#8d8579] focus:border-[#0b4a47] focus:ring-2 focus:ring-[#0b4a47]/15"
          />
        </>
      )}
      <p className="mt-2 text-xs leading-5 text-[#6b655b]">
        API-nøglen gemmes i denne browser. Den bliver først sendt, når
        AI-funktionen tilføjes, og gemmes aldrig på vores server.
      </p>
    </div>
  );
}
