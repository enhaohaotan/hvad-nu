import { useEffect, useRef, useState } from "react";
import { StepLabel } from "@/app/_components/step-label";
import { LEVELS, type DanishLevel, type LearnerProfile } from "../types";

type SetupStepsProps = {
  apiKey: string;
  hasLoaded: boolean;
  isApiKeySaved: boolean;
  profile: LearnerProfile;
  todayCount: number;
  isGenerating: boolean;
  todayLabel: string;
  onApiKeyChange: (value: string) => void;
  onForgetApiKey: () => void;
  onLevelChange: (level: DanishLevel) => void;
  onStart: () => void;
};

export function SetupSteps({
  apiKey,
  hasLoaded,
  isApiKeySaved,
  profile,
  todayCount,
  isGenerating,
  todayLabel,
  onApiKeyChange,
  onForgetApiKey,
  onLevelChange,
  onStart,
}: SetupStepsProps) {
  return (
    <section
      className="mt-6 border-y-2 border-[#0b4a47] sm:mt-10"
      aria-label="Indstil og opret dagens session"
    >
      <div className="grid lg:grid-cols-[190px_1fr]">
        <div className="border-b border-[#0b4a47]/35 py-3 lg:border-b-0 lg:border-r lg:py-5 lg:pr-8">
          <StepLabel number="01" label="Gem din API-nøgle" accent="#0b4a47" />
        </div>
        <div className="py-4 sm:py-5 lg:pl-8">
          <ApiKeyField
            apiKey={apiKey}
            isSaved={isApiKeySaved}
            onChange={onApiKeyChange}
            onForget={onForgetApiKey}
            disabled={isGenerating}
          />
        </div>
      </div>

      <div
        className="grid border-t border-[#0b4a47]/45 lg:grid-cols-[190px_1fr]"
        aria-label="Opret dagens session"
      >
        <div className="border-b border-[#0b4a47]/35 py-5 lg:border-b-0 lg:border-r lg:pr-8">
          <StepLabel number="02" label="Opret dagens session" accent="#0b4a47" />
        </div>
        <div className="py-6 lg:pl-8">
          <fieldset disabled={isGenerating} className="disabled:pointer-events-none disabled:opacity-60">
            <legend className="sr-only">Dit danske niveau</legend>
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
              <p className="editorial-serif whitespace-nowrap text-xl">Dit danske niveau</p>
              <MobileLevelPicker
                value={profile.selectedLevel}
                onChange={onLevelChange}
                disabled={isGenerating}
              />
              <div className="hidden grid-cols-7 gap-px bg-[#29231b]/25 p-px sm:grid">
                {LEVELS.map((level) => (
                  <label
                    key={level}
                    className={`flex min-h-8 cursor-pointer items-center justify-center px-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.08em] transition ${
                      profile.selectedLevel === level
                        ? "bg-[#0b4a47] text-[#f8f2e6]"
                        : "bg-[#f7f2e8] text-[#575147] hover:bg-[#e9e3d6]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="danish-level"
                      value={level}
                      checked={profile.selectedLevel === level}
                      onChange={() => onLevelChange(level)}
                      className="sr-only"
                    />
                    {level}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>
          <button
            type="button"
            onClick={onStart}
            disabled={!hasLoaded || !apiKey.trim() || isGenerating}
            className="mt-6 flex min-h-[56px] w-full items-center justify-between bg-[#0b4a47] px-6 text-xs font-semibold uppercase tracking-[0.15em] text-[#f8f2e6] transition enabled:hover:bg-[#083b39] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a47]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>{isGenerating ? "Opretter session …" : todayCount > 0 ? "Lav en ny session" : "Lav dagens session"}</span>
            <span className="text-lg" aria-hidden="true">→</span>
          </button>
          {!apiKey && hasLoaded && (
            <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#70847e]">
              Gem din API-nøgle i trin 01 for at fortsætte
            </p>
          )}
          <p className="mt-2 capitalize text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4d6e65]">
            {todayLabel} · ca. 25 minutter
          </p>
        </div>
      </div>
    </section>
  );
}

function MobileLevelPicker({
  value,
  onChange,
  disabled,
}: {
  value: DanishLevel;
  onChange: (value: DanishLevel) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={pickerRef} className="relative w-[72px] justify-self-end sm:hidden">
      <button
      type="button"
      disabled={disabled}
        aria-expanded={isOpen}
        aria-controls="mobile-level-options"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between border border-[#29231b]/35 bg-[#f7f2e8] px-3 py-2 text-[10px] font-semibold text-[#29231b] outline-none transition focus-visible:border-[#0b4a47] focus-visible:ring-2 focus-visible:ring-[#0b4a47]/15"
      >
        <span>{value}</span>
        <span
          className={`h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-current transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div
          id="mobile-level-options"
          className="absolute left-0 right-0 z-30 mt-px border border-[#29231b]/40 bg-[#f7f2e8]"
        >
          {LEVELS.map((level) => {
            const isSelected = value === level;
            return (
              <button
                key={level}
                type="button"
                aria-pressed={isSelected}
                onClick={() => {
                  onChange(level);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[10px] font-semibold transition ${
                  isSelected
                    ? "bg-[#0b4a47] text-[#f8f2e6]"
                    : "text-[#575147] hover:bg-[#0b4a47] hover:text-[#f8f2e6] focus-visible:bg-[#0b4a47] focus-visible:text-[#f8f2e6] focus-visible:outline-none"
                }`}
              >
                <span>{level}</span>
                {isSelected && <span aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ApiKeyField({
  apiKey,
  isSaved,
  onChange,
  onForget,
  disabled,
}: {
  apiKey: string;
  isSaved: boolean;
  onChange: (value: string) => void;
  onForget: () => void;
  disabled: boolean;
}) {
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <p className="editorial-serif text-xl">OpenAI API-nøgle</p>
        {isSaved && (
          <button
            type="button"
            onClick={onForget}
            disabled={disabled}
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b655b] underline underline-offset-4 hover:text-[#0b4a47] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a47]/25"
          >
            Fjern nøgle
          </button>
        )}
      </div>
      {isSaved ? (
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
            disabled={disabled}
            className="mt-3 min-h-13 w-full border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 font-mono text-[15px] outline-none transition placeholder:text-[#8d8579] focus:border-[#0b4a47] focus:ring-2 focus:ring-[#0b4a47]/15"
          />
        </>
      )}
      <p className="mt-2 text-xs leading-5 text-[#6b655b]">
        API-nøglen gemmes i denne browser. Den sendes kun, når indhold oprettes
        eller feedback gives, og gemmes aldrig på vores server.
      </p>
    </div>
  );
}
