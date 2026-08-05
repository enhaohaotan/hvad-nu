"use client";

import { useState } from "react";
import { buildDebugReport } from "@/lib/browser-diagnostics";
import type { TranscriptionPhase } from "@/lib/transcription-client";

export function StatusPanel({
  phase,
  message,
  errorDebug,
  episodeUrl,
  progress,
  isWorking,
  onCancel,
}: {
  phase: TranscriptionPhase;
  message: string;
  errorDebug: string;
  episodeUrl: string;
  progress: number;
  isWorking: boolean;
  onCancel: () => void;
}) {
  const isError = phase === "error";
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [isDebugCopied, setIsDebugCopied] = useState(false);
  const [isErrorContactCopied, setIsErrorContactCopied] = useState(false);
  const errorDetail =
    isError &&
    message === "Episoden findes ikke i DR LYDs offentlige RSS-feed."
      ? "Det kan skyldes DR LYDs udgivelsespolitik: De nyeste episoder er ikke altid tilgængelige i det offentlige RSS-feed med det samme. Prøv en episode fra en tidligere dag."
      : "";
  const debugReport = errorDebug
    ? buildDebugReport({ message, errorDebug, episodeUrl })
    : "";

  async function copyErrorDebug() {
    await navigator.clipboard.writeText(debugReport);
    setIsDebugCopied(true);
    setTimeout(() => setIsDebugCopied(false), 2000);
  }

  async function copyErrorContactEmail() {
    await navigator.clipboard.writeText("enhaohao.tan@gmail.com");
    setIsErrorContactCopied(true);
    setTimeout(() => setIsErrorContactCopied(false), 2000);
  }

  return (
    <div
      className={`border-t border-[#9f211e]/45 px-4 py-5 sm:px-6 ${isError ? "bg-[#9f211e]/5" : ""}`}
      role={isError ? "alert" : "status"}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${isError ? "text-[#9f211e]" : "text-[#575147]"}`}
            >
              {message}
            </p>
            {errorDetail && (
              <button
                type="button"
                onClick={() => setShowErrorDetail((visible) => !visible)}
                aria-expanded={showErrorDetail}
                className="cursor-pointer text-[10px] font-semibold uppercase tracking-[0.1em] text-[#625b52] underline decoration-current/40 underline-offset-4 transition hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
              >
                Hvorfor?
              </button>
            )}
          </div>
          {errorDetail && showErrorDetail && (
            <p className="mt-2 max-w-[720px] text-xs font-normal normal-case leading-5 tracking-normal text-[#625b52] sm:text-[13px] sm:leading-6">
              {errorDetail}
            </p>
          )}
          {isError && errorDebug && (
            <p className="mt-3 max-w-[900px] text-xs font-normal normal-case leading-5 tracking-normal text-[#625b52]">
              <span>Hvis fejlen opstår flere gange, så </span>
              <button
                type="button"
                onClick={() => void copyErrorDebug()}
                aria-live="polite"
                className="cursor-pointer font-semibold text-[#9f211e] underline decoration-current/40 underline-offset-4 transition hover:text-[#6f1715] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
              >
                kopiér fejloplysningerne{isDebugCopied ? " (kopieret)" : ""}
              </button>
              <span> og send dem til mig via </span>
              <button
                type="button"
                onClick={() => void copyErrorContactEmail()}
                aria-live="polite"
                className="cursor-pointer font-semibold text-[#9f211e] underline decoration-current/40 underline-offset-4 transition hover:text-[#6f1715] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
              >
                e-mail{isErrorContactCopied ? " (kopieret)" : ""}
              </button>
              <span>.</span>
            </p>
          )}
        </div>
        {isWorking && (
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b655b] underline underline-offset-4 hover:text-[#9f211e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9f211e]/25"
          >
            Annuller
          </button>
        )}
      </div>
      {isWorking && (
        <div className="mt-4 h-[3px] overflow-hidden bg-[#76866f]/25">
          <div
            className="h-full bg-[#9f211e] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
