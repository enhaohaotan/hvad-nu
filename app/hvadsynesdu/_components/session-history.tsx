import type { LearningSession } from "../types";

export function SessionHistory({ sessions, activeId, onSelect }: {
  sessions: LearningSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!sessions.length) return null;
  return (
    <details className="mt-4 border border-[#0b4a47]/35">
      <summary className="cursor-pointer px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#415d56] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0b4a47]/20">
        Historik · {sessions.length}/10 sessioner
      </summary>
      <div className="border-t border-[#0b4a47]/25">
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session.id)}
            className={`grid w-full grid-cols-[7rem_1fr] gap-4 border-b border-[#0b4a47]/15 px-4 py-3 text-left last:border-b-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0b4a47]/20 ${activeId === session.id ? "bg-[#0b4a47] text-[#f8f2e6]" : "hover:bg-[#0b4a47]/5"}`}
          >
            <span className="text-[9px] font-semibold uppercase tracking-[0.1em] opacity-75">
              {formatDate(session.createdAt)}
            </span>
            <span className="truncate text-xs font-semibold">{session.content.reading.title}</span>
          </button>
        ))}
      </div>
    </details>
  );
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}
