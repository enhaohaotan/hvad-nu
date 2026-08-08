import { STORAGE_LIMITS } from "../constants";
import type { LearningSession, SavedExpression, SavedMistake } from "../types";

type LibraryPanelProps = {
  expressions: SavedExpression[];
  history: LearningSession[];
  mistakes: SavedMistake[];
};

export function LibraryPanel({ expressions, history, mistakes }: LibraryPanelProps) {
  return (
    <section className="mt-14 border-y-2 border-[#0b4a47]" aria-labelledby="library-title">
      <div className="grid lg:grid-cols-[190px_1fr]">
        <div className="border-b border-[#0b4a47]/35 py-5 lg:border-b-0 lg:border-r lg:pr-8">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#d9542b]">Brug det igen</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#415d56]">Dit sproglager</p>
        </div>
        <div className="py-7 sm:py-9 lg:pl-8">
          <h2 id="library-title" className="editorial-serif text-3xl leading-none tracking-[-0.025em] sm:text-4xl">Mit sproglager</h2>
          <ExpressionList expressions={expressions} />
          <MistakeList mistakes={mistakes} />
          <SessionHistory history={history} />
        </div>
      </div>
    </section>
  );
}

function ExpressionList({ expressions }: { expressions: SavedExpression[] }) {
  return (
    <section className="mt-7">
      <PanelHeading title="Gemte vendinger" count={`${expressions.length}/${STORAGE_LIMITS.expressions}`} />
      {expressions.length ? (
        <div className="mt-3 divide-y divide-[#0b4a47]/25 border-y border-[#0b4a47]/25">
          {expressions.map((item) => (
            <div key={item.id} className="py-4">
              <p className="editorial-serif text-xl text-[#b84424]">{item.expression}</p>
              <p className="mt-1 text-xs leading-5 text-[#62756e]">{item.meaning}</p>
              <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#84918c]">{item.source}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 border border-dashed border-[#0b4a47]/35 p-5 text-sm leading-6 text-[#677872]">
          Dine gemte vendinger dukker op her. Tryk på en markeret vending i
          dagens tekst for at begynde.
        </p>
      )}
    </section>
  );
}

function MistakeList({ mistakes }: { mistakes: SavedMistake[] }) {
  return (
    <section className="mt-9 border-t-2 border-[#0b4a47] pt-6">
      <PanelHeading title="Mønstre jeg holder øje med" count={`${mistakes.length}/${STORAGE_LIMITS.mistakes}`} />
      {mistakes.length ? (
        <div className="mt-3 divide-y divide-[#0b4a47]/25 border-y border-[#0b4a47]/25">
          {mistakes.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 py-4">
              <div>
                <p className="text-sm">
                  <span className="line-through decoration-[#d9542b]">{item.pattern}</span>
                  <span className="mx-1 text-[#84918c]">→</span>
                  <strong>{item.correction}</strong>
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#72827c]">Set {item.count} {item.count === 1 ? "gang" : "gange"}</p>
              </div>
              <span className="text-[#d9542b]">↻</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 border border-dashed border-[#0b4a47]/35 p-5 text-sm leading-6 text-[#677872]">
          Når den samme fejl dukker op flere gange, gemmer vi mønstret her og
          tager det op igen i en senere session.
        </p>
      )}
    </section>
  );
}

function SessionHistory({ history }: { history: LearningSession[] }) {
  return (
    <section className="mt-9 border-t-2 border-[#0b4a47] pt-6">
      <PanelHeading title="Seneste sessioner" count={`maks. ${STORAGE_LIMITS.sessions}`} />
      <div className="mt-3 divide-y divide-[#0b4a47]/25">
        {history.length ? history.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_auto] gap-4 py-4">
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#72827c]">{item.date}</p>
            </div>
            <span className="text-[10px] font-bold uppercase text-[#d9542b]">{item.completedAt ? "Færdig" : "I gang"}</span>
          </div>
        )) : (
          <p className="py-5 text-sm text-[#677872]">Ingen sessioner endnu.</p>
        )}
      </div>
    </section>
  );
}

function PanelHeading({ title, count }: { title: string; count: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em]">{title}</h3>
      <span className="text-[10px] text-[#6c7d77]">{count}</span>
    </div>
  );
}
