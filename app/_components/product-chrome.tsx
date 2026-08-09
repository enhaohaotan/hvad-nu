import type { ReactNode } from "react";

export function ProductHeader({
  title,
  secondaryText = "For dem, der stadig siger “hva’?”",
  secondaryColor = "#66745e",
  borderColor = "rgba(38,32,24,0.7)",
}: {
  title: string;
  secondaryText?: string;
  secondaryColor?: string;
  borderColor?: string;
}) {
  return (
    <header
      className="flex items-center justify-between gap-4 border-b pb-2.5 text-[9px] font-semibold uppercase tracking-[0.14em] sm:pb-3 sm:text-xs sm:tracking-[0.18em]"
      style={{ borderColor }}
    >
      <span>{title}</span>
      <span className="text-right" style={{ color: secondaryColor }}>
        {secondaryText}
      </span>
    </header>
  );
}

export function ProductHero({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full">
      <h1 className="editorial-serif text-[clamp(3rem,13vw,4.75rem)] uppercase leading-[0.86] tracking-[-0.06em] sm:text-[clamp(5rem,8vw,8.5rem)] sm:leading-[0.82] sm:tracking-[-0.065em]">
        {title}
      </h1>
      <p className="editorial-serif mt-5 w-full text-[13px] leading-5 text-[#4b463f] sm:mt-7 sm:text-base sm:leading-7">
        {children}
      </p>
    </div>
  );
}

export function ProductFooter({
  borderColor = "rgba(38,32,24,0.7)",
  interactionClassName,
  isCopied,
  onContact,
}: {
  borderColor?: string;
  interactionClassName: string;
  isCopied: boolean;
  onContact: () => void;
}) {
  return (
    <footer
      className="mt-14 flex items-center justify-between gap-4 border-t pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#575147]"
      style={{ borderColor }}
    >
      <address className="not-italic">
        <button
          type="button"
          onClick={onContact}
          className={`cursor-pointer uppercase underline decoration-current/35 underline-offset-4 transition focus:outline-none focus-visible:ring-2 ${interactionClassName}`}
        >
          {isCopied ? "E-MAIL KOPIERET" : "KONTAKT"}
        </button>
      </address>
      <span>© 2026 Enhao Tan</span>
    </footer>
  );
}
