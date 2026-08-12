export function EditorialSectionHeader({
  eyebrow,
  title,
  metadata,
  variant = "transcription",
  reserveActions = false,
}: {
  eyebrow: string;
  title?: string;
  metadata?: readonly string[];
  variant?: "transcription" | "discussion";
  reserveActions?: boolean;
}) {
  const isDiscussion = variant === "discussion";

  return (
    <header
      className={`border-b border-[#29231b]/40 pb-6 ${
        reserveActions ? "md:pr-[220px]" : ""
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
          isDiscussion ? "text-[#d9542b]" : "text-[#9f211e]"
        }`}
      >
        {eyebrow}
      </p>
      {title && (
        <h2
          className={`editorial-serif mt-2 text-3xl leading-none tracking-[-0.035em] sm:text-5xl ${
            isDiscussion
              ? "max-w-[1400px] [text-wrap:balance]"
              : "max-w-[900px]"
          }`}
        >
          {title}
        </h2>
      )}
      {metadata?.length ? (
        <div
          className={`mt-5 flex max-w-2xl flex-wrap items-center gap-x-3 gap-y-1 border-l-2 py-1 pl-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#5f756e] sm:text-[11px] ${
            isDiscussion ? "border-[#d9542b]" : "border-[#9f211e]"
          }`}
        >
          {metadata.map((item, index) => (
            <span key={item} className="contents">
              {index > 0 && <span aria-hidden="true">·</span>}
              <span>{item}</span>
            </span>
          ))}
        </div>
      ) : null}
    </header>
  );
}
