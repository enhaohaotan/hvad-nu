import { DAILY_READING } from "../daily-content";

export function ReadingSection() {
  return (
    <section
      className="border-b-2 border-[#0b4a47]"
      aria-label="Dagens læsning"
    >
      <article className="py-9 lg:py-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d9542b]">
          01 · Dagens læsning
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#5f756e] sm:text-[11px]">
          {DAILY_READING.metadata.map((item, index) => (
            <span key={item} className="contents">
              {index > 0 && <span aria-hidden="true">·</span>}
              <span>{item}</span>
            </span>
          ))}
        </div>
        <h2 className="editorial-serif mt-4 max-w-4xl text-[2.55rem] leading-[0.96] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
          {DAILY_READING.title}
        </h2>
        <div className="editorial-serif discussion-copy mt-9 max-w-[52rem] space-y-5 text-[17px] leading-[1.72] text-[#263a35] sm:mt-11 sm:text-xl sm:leading-[1.78]">
          {DAILY_READING.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
    </section>
  );
}
