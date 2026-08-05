"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { DrEpisode } from "@/lib/dr";

const API_KEY_STORAGE = "danish-listening-companion.openai-api-key";

type Phase =
  | "idle"
  | "resolving"
  | "ready"
  | "downloading"
  | "preparing"
  | "transcribing"
  | "done"
  | "error";

export function ListeningCompanion() {
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [episode, setEpisode] = useState<DrEpisode | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [transcript, setTranscript] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let storedKey = "";
    try {
      storedKey = localStorage.getItem(API_KEY_STORAGE) ?? "";
    } catch {
      // Browser storage can be unavailable in hardened privacy modes.
    }
    const frame = requestAnimationFrame(() => setApiKey(storedKey));
    return () => cancelAnimationFrame(frame);
  }, []);

  const isWorking = [
    "resolving",
    "downloading",
    "preparing",
    "transcribing",
  ].includes(phase);

  async function handleResolve(event: FormEvent) {
    event.preventDefault();
    if (!url.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setEpisode(null);
    setTranscript("");
    setMessage("");
    setPhase("resolving");
    setProgress(0);

    try {
      const response = await fetch(`/api/resolve?url=${encodeURIComponent(url)}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const body = (await response.json()) as {
        episode?: DrEpisode;
        error?: string;
      };
      if (!response.ok || !body.episode) {
        throw new Error(body.error || "Episoden kunne ikke findes.");
      }
      setEpisode(body.episode);
      setPhase("ready");
    } catch (error) {
      if (controller.signal.aborted) return;
      setPhase("error");
      setMessage(errorMessage(error));
    }
  }

  function handleApiKey(value: string) {
    setApiKey(value);
    try {
      if (value) localStorage.setItem(API_KEY_STORAGE, value);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      // The input still works for this session when storage is unavailable.
    }
  }

  function forgetApiKey() {
    handleApiKey("");
  }

  async function handleTranscribe() {
    if (!episode || !apiKey.trim() || isWorking) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setTranscript("");
    setMessage("Downloader episoden fra DR…");
    setProgress(0);
    setPhase("downloading");

    try {
      const finalText = await transcribeEpisode({
        url: episode.sourceUrl,
        apiKey: apiKey.trim(),
        signal: controller.signal,
        onProgress(event) {
          setPhase(event.phase);
          setMessage(event.message);
          setProgress(event.progress);
        },
        onTranscript(value) {
          setTranscript(value);
        },
      });
      setTranscript(finalText);

      setPhase("done");
      setMessage("Transskriptionen er klar");
      setProgress(100);
    } catch (error) {
      if (controller.signal.aborted) {
        setPhase(episode ? "ready" : "idle");
        setMessage("");
        setProgress(0);
        return;
      }
      setPhase("error");
      setMessage(errorMessage(error));
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  async function copyTranscript() {
    if (!transcript) return;
    await navigator.clipboard.writeText(transcript);
    setMessage("Kopieret til udklipsholderen");
  }

  return (
    <main className="min-h-screen bg-[#9f211e] p-2.5 text-[#1d1915] sm:p-5 lg:p-7">
      <div className="editorial-sheet min-h-[calc(100vh-20px)] w-full bg-[#f3eddf] px-5 pb-8 pt-6 shadow-[0_24px_80px_rgba(43,8,6,0.28)] sm:min-h-[calc(100vh-40px)] sm:px-10 sm:pb-10 lg:min-h-[calc(100vh-56px)] lg:px-16 lg:pt-9">
        <header className="border-b border-[#262018]/70 pb-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] sm:pb-3 sm:text-xs sm:tracking-[0.18em]">
          <a href="#top" aria-label="Hva’ sagde de? – forside">
            Hva’ sagde de?
          </a>
        </header>

        <section id="top" className="pt-6 sm:pt-14 lg:pt-16">
          <div className="w-full">
            <h1 className="editorial-serif text-[clamp(3rem,13vw,4.75rem)] uppercase leading-[0.86] tracking-[-0.06em] sm:text-[clamp(5rem,8vw,8.5rem)] sm:leading-[0.82] sm:tracking-[-0.065em]">
              Hva’ sagde de?
            </h1>
            <p className="editorial-serif mt-5 w-full text-[13px] leading-5 text-[#4b463f] sm:mt-7 sm:text-base sm:leading-7">
              Gør enhver DR-podcastepisode til en tydelig dansk transskription — klar til at læse med, mens du lytter.
            </p>
          </div>

          <section className="mt-6 border-y-2 border-[#9f211e] sm:mt-10" aria-label="Lav en transskription">
            <form onSubmit={handleResolve} className="grid lg:grid-cols-[190px_1fr]">
              <div className="border-b border-[#9f211e]/35 py-3 lg:border-b-0 lg:border-r lg:py-5 lg:pr-8">
                <StepLabel number="01" label="Vælg en udsendelse" />
              </div>
              <div className="py-4 sm:py-5 lg:pl-8">
                <label htmlFor="episode-url" className="editorial-serif text-xl">Indsæt et link til en DR-episode</label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <input
                    id="episode-url"
                    type="url"
                    inputMode="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://www.dr.dk/lyd/…"
                    disabled={isWorking}
                    className="min-h-13 flex-1 border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 text-[15px] outline-none transition placeholder:text-[#8d8579] focus:border-[#9f211e] focus:ring-2 focus:ring-[#9f211e]/15 disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={!url.trim() || isWorking}
                    className="min-h-13 border border-[#1d1915] bg-[#1d1915] px-7 text-xs font-semibold uppercase tracking-[0.14em] text-[#f8f2e6] transition hover:bg-[#9f211e] focus:outline-none focus:ring-2 focus:ring-[#9f211e]/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {phase === "resolving" ? "Finder…" : "Find episode"}
                  </button>
                </div>
              </div>
            </form>

            {episode && (
              <div className="border-t border-[#9f211e]/45">
                <div className="grid lg:grid-cols-[190px_1fr]">
                  <div className="border-b border-[#9f211e]/35 py-5 lg:border-b-0 lg:border-r lg:pr-8">
                    <StepLabel number="02" label="Gennemse og transskriber" />
                  </div>
                  <div className="py-6 lg:pl-8">
                    <EpisodePreview episode={episode} />

                    <div className="mt-7 border-t border-[#29231b]/20 pt-6">
                      <div className="flex items-end justify-between gap-4">
                        <label htmlFor="api-key" className="editorial-serif text-xl">OpenAI API-nøgle</label>
                        {apiKey && (
                          <button type="button" onClick={forgetApiKey} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b655b] underline underline-offset-4 hover:text-[#9f211e]">
                            Glem nøgle
                          </button>
                        )}
                      </div>
                      <input
                        id="api-key"
                        type="password"
                        value={apiKey}
                        onChange={(event) => handleApiKey(event.target.value)}
                        placeholder="sk-…"
                        autoComplete="off"
                        spellCheck={false}
                        disabled={isWorking}
                        className="mt-3 min-h-13 w-full border border-[#29231b]/35 bg-[#f7f2e8]/70 px-4 font-mono text-[15px] outline-none transition placeholder:text-[#8d8579] focus:border-[#9f211e] focus:ring-2 focus:ring-[#9f211e]/15 disabled:opacity-60"
                      />
                      <p className="mt-2 text-xs leading-5 text-[#6b655b]">
                        Gemmes i denne browser. Sendes kun ved transskription og gemmes aldrig på vores server.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleTranscribe}
                      disabled={!apiKey.trim() || isWorking}
                      className="mt-6 flex min-h-[56px] w-full items-center justify-between bg-[#9f211e] px-6 text-xs font-semibold uppercase tracking-[0.15em] text-[#f8f2e6] transition hover:bg-[#851b18] focus:outline-none focus:ring-2 focus:ring-[#9f211e]/30 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>{phase === "done" ? "Lav en ny" : "Lav transskription"}</span>
                      <span className="text-lg" aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {(isWorking || message) && (
              <StatusPanel phase={phase} message={message} progress={progress} isWorking={isWorking} onCancel={cancel} />
            )}
          </section>

          {transcript && (
            <section className="mt-12 border-t-4 border-[#76866f] pt-7 sm:mt-16 sm:pt-9" aria-labelledby="transcript-title">
              <div className="grid gap-6 border-b border-[#29231b]/40 pb-6 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9f211e]">Transskriptionen</p>
                  <h2 id="transcript-title" className="editorial-serif mt-2 max-w-[900px] text-3xl leading-none tracking-[-0.035em] sm:text-5xl">{episode?.episodeTitle}</h2>
                </div>
                <button type="button" onClick={copyTranscript} className="w-fit border border-[#29231b] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition hover:bg-[#29231b] hover:text-[#f8f2e6] focus:outline-none focus:ring-2 focus:ring-black/20">
                  Kopiér tekst
                </button>
              </div>
              <article aria-live="polite" className="editorial-copy mx-auto max-w-[880px] whitespace-pre-wrap py-9 text-[18px] leading-[1.85] text-[#332e27] sm:py-12 sm:text-[20px]">
                {transcript}
                {phase === "transcribing" && <span className="ml-1 inline-block h-5 w-0.5 animate-pulse bg-[#9f211e] align-middle" aria-hidden="true" />}
              </article>
            </section>
          )}
        </section>

        <footer className="mt-14 flex flex-col gap-2 border-t border-[#262018]/70 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#575147] sm:flex-row sm:items-center sm:justify-between">
          <span>Til nysgerrige danskstuderende</span>
          <span>© 2026 Enhao Tan</span>
        </footer>
      </div>
    </main>
  );
}

function StepLabel({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <span className="font-mono text-xs font-semibold text-[#9f211e]">{number}</span>
      <p className="mt-2 text-[10px] font-semibold uppercase leading-4 tracking-[0.15em] text-[#575147]">{label}</p>
    </div>
  );
}

function EpisodePreview({ episode }: { episode: DrEpisode }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[112px_1fr] sm:items-center">
      {episode.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={episode.imageUrl} alt="" className="h-28 w-28 border border-[#29231b]/30 object-cover grayscale-[18%]" />
      ) : (
        <div className="flex h-28 w-28 items-center justify-center border border-[#29231b]/30 bg-[#e4dccb] text-2xl" aria-hidden="true">♪</div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#9f211e]">{episode.showTitle}</p>
        <h2 className="editorial-serif mt-2 line-clamp-3 text-2xl leading-[1.05] tracking-[-0.03em] sm:text-3xl">{episode.episodeTitle}</h2>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b655b]">{formatEpisodeMeta(episode)}</p>
      </div>
    </div>
  );
}

function StatusPanel({ phase, message, progress, isWorking, onCancel }: { phase: Phase; message: string; progress: number; isWorking: boolean; onCancel: () => void }) {
  const isError = phase === "error";
  return (
    <div className={`border-t border-[#9f211e]/45 px-0 py-5 sm:px-6 ${isError ? "bg-[#9f211e]/5" : ""}`} role={isError ? "alert" : "status"}>
      <div className="flex items-center justify-between gap-4">
        <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${isError ? "text-[#9f211e]" : "text-[#575147]"}`}>{message}</p>
        {isWorking && <button type="button" onClick={onCancel} className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b655b] underline underline-offset-4 hover:text-[#9f211e]">Annuller</button>}
      </div>
      {isWorking && (
        <div className="mt-4 h-[3px] overflow-hidden bg-[#76866f]/25">
          <div className={`h-full bg-[#9f211e] transition-[width] duration-300 ${progress === 0 ? "w-1/3 animate-[pulse_1.4s_ease-in-out_infinite]" : ""}`} style={progress > 0 ? { width: `${progress}%` } : undefined} />
        </div>
      )}
    </div>
  );
}

async function transcribeEpisode({ url, apiKey, signal, onProgress, onTranscript }: { url: string; apiKey: string; signal: AbortSignal; onProgress: (event: { phase: "downloading" | "preparing" | "transcribing"; message: string; progress: number }) => void; onTranscript: (value: string) => void }): Promise<string> {
  const response = await fetch("/api/transcribe", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
    signal,
  });

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || "Episoden kunne ikke transskriberes.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let finalText = "";
  let streamError = "";

  function consume(block: string) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;

    try {
      const event = JSON.parse(data) as { type?: string; delta?: string; text?: string; message?: string; phase?: "downloading" | "preparing" | "transcribing"; progress?: number };
      if (event.type === "transcript.text.delta" && event.delta) {
        accumulated += event.delta;
        onTranscript(accumulated);
      } else if (event.type === "companion.progress" && event.phase && event.message) {
        onProgress({ phase: event.phase, message: event.message, progress: event.progress ?? 0 });
      } else if (event.type === "companion.done" && event.text) {
        finalText = event.text;
        onTranscript(finalText);
      } else if (event.type === "companion.error") {
        streamError = event.message || "Episoden kunne ikke transskriberes.";
      }
    } catch {
      // Ignore non-JSON heartbeat or provider metadata events.
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(consume);
    if (done) break;
  }
  if (buffer.trim()) consume(buffer);

  if (streamError) throw new Error(streamError);

  return (finalText || accumulated).trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Noget gik galt. Prøv igen.";
}

function formatEpisodeMeta(episode: DrEpisode): string {
  const parts: string[] = [];
  if (episode.publishedAt) {
    const date = new Date(episode.publishedAt);
    if (!Number.isNaN(date.getTime())) parts.push(new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric" }).format(date));
  }
  if (episode.duration) parts.push(episode.duration);
  return parts.join(" · ");
}
