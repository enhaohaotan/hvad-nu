import {
  TRANSCRIPTION_MODES,
  type TranscriptionMode,
} from "@/lib/transcription-mode";

export function ApiKeyPanel({
  apiKey,
  isInputVisible,
  isWorking,
  transcriptionMode,
  onChange,
  onForget,
  onTranscriptionModeChange,
}: {
  apiKey: string;
  isInputVisible: boolean;
  isWorking: boolean;
  transcriptionMode: TranscriptionMode;
  onChange: (value: string) => void;
  onForget: () => void;
  onTranscriptionModeChange: (mode: TranscriptionMode) => void;
}) {
  const selectedMode = TRANSCRIPTION_MODES[transcriptionMode];
  const dkkPerMinute = selectedMode.pricePerMinuteUsd * 6.57;

  return (
    <div className="mt-7 border-t border-[#29231b]/20 pt-6">
      <div className="flex items-end justify-between gap-4">
        <p className="editorial-serif text-xl">OpenAI API-nøgle</p>
        {apiKey && (
          <button
            type="button"
            onClick={onForget}
            disabled={isWorking}
            className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b655b] underline underline-offset-4 enabled:hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25 disabled:opacity-40"
          >
            Fjern nøgle
          </button>
        )}
      </div>
      {isInputVisible ? (
        <>
          <label htmlFor="api-key" className="sr-only">
            OpenAI API-nøgle
          </label>
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(event) => onChange(event.target.value)}
            placeholder="sk-…"
            autoComplete="off"
            spellCheck={false}
            disabled={isWorking}
            className="mt-3 min-h-13 w-full border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 font-mono text-[15px] outline-none transition placeholder:text-[#8d8579] focus:border-[#9f211e] focus:ring-2 focus:ring-[#9f211e]/15 disabled:opacity-60"
          />
        </>
      ) : (
        <p className="mt-3 border border-[#76866f]/40 bg-[#76866f]/5 px-4 py-3 text-xs font-semibold text-[#4f5f49]">
          API-nøglen er gemt i denne browser
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-[#6b655b]">
        API-nøglen gemmes i denne browser. Den sendes kun ved transskription og
        gemmes aldrig på vores server.
      </p>
      <details className="group mt-4 border-t border-[#29231b]/15 pt-2">
        <summary
          aria-disabled={isWorking}
          tabIndex={isWorking ? -1 : undefined}
          onClick={(event) => {
            if (isWorking) event.preventDefault();
          }}
          onKeyDown={(event) => {
            if (isWorking && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
            }
          }}
          className={`inline-flex list-none items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#575147] transition [&::-webkit-details-marker]:hidden ${
            isWorking
              ? "cursor-default opacity-55"
              : "cursor-pointer hover:text-[#9f211e]"
          }`}
        >
          <span
            aria-hidden="true"
            className="h-0 w-0 shrink-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-current transition-transform group-open:rotate-90"
          />
          <span className="underline decoration-current/40 underline-offset-4">
            Vælg transskriptionsmetode og se estimeret OpenAI-pris · {selectedMode.label}
          </span>
        </summary>
        <fieldset className="mt-4" disabled={isWorking}>
          <legend className="sr-only">
            Vælg transskriptionsmetode
          </legend>
          <div className="mt-3 border border-[#29231b]/25">
            {Object.entries(TRANSCRIPTION_MODES).map(([mode, option]) => {
              const isSelected = transcriptionMode === mode;
              return (
                <label
                  key={mode}
                  className={`grid gap-x-4 gap-y-1 border-b px-4 py-3 transition last:border-b-0 sm:grid-cols-[minmax(230px,auto)_1fr] sm:items-center ${
                    isSelected
                      ? "border-[#29231b] bg-[#29231b] text-[#f8f2e6]"
                      : `border-[#29231b]/20 ${
                          isWorking ? "" : "hover:bg-[#eee7da]"
                        }`
                  } ${
                    isWorking
                      ? "cursor-default opacity-55"
                      : "cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="transcription-mode"
                    value={mode}
                    checked={isSelected}
                    onChange={() =>
                      onTranscriptionModeChange(mode as TranscriptionMode)
                    }
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em]">
                    <span>{option.label}</span>
                    {option.badge && (
                      <span
                        className={`text-[8px] tracking-[0.12em] ${
                          isSelected ? "text-[#b7c3ae]" : "text-[#76866f]"
                        }`}
                      >
                        {option.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[11px] leading-4 ${
                      isSelected ? "text-[#f8f2e6]/70" : "text-[#6b655b]"
                    }`}
                  >
                    {option.description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div className="mt-3 overflow-hidden border border-[#29231b]/20">
          <p className="px-4 py-2 text-[10px] text-[#70695f]">
            {selectedMode.label}: ca. {formatUsd(selectedMode.pricePerMinuteUsd)} USD/min.
          </p>
          <table className="w-full table-fixed text-left text-xs text-[#575147]">
            <caption className="sr-only">
              Estimeret pris efter episodens varighed
            </caption>
            <thead className="bg-[#76866f]/5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#70695f]">
              <tr>
                <th className="px-4 py-2" scope="col">
                  Varighed
                </th>
                <th className="px-4 py-2" scope="col">
                  Pris
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#29231b]/10">
              <tr>
                <td className="px-4 py-2">20 min.</td>
                <td className="px-4 py-2">ca. {formatDkk(dkkPerMinute * 20)} kr.</td>
              </tr>
              <tr>
                <td className="px-4 py-2">40 min.</td>
                <td className="px-4 py-2">ca. {formatDkk(dkkPerMinute * 40)} kr.</td>
              </tr>
              <tr>
                <td className="px-4 py-2">60 min.</td>
                <td className="px-4 py-2">ca. {formatDkk(dkkPerMinute * 60)} kr.</td>
              </tr>
            </tbody>
          </table>
          <p className="border-t border-[#29231b]/15 px-4 py-2 text-[10px] leading-4 text-[#70695f]">
            Omregnet med 1 USD ≈ 6,57 kr. Betales direkte til OpenAI. Priser og
            valutakurs kan ændre sig.
          </p>
        </div>
      </details>
    </div>
  );
}

function formatUsd(value: number): string {
  return value.toLocaleString("da-DK", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
  });
}

function formatDkk(value: number): string {
  return value.toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
