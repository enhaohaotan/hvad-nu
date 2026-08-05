export function StepLabel({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div>
      <span className="font-mono text-xs font-semibold text-[#9f211e]">
        {number}
      </span>
      <p className="mt-2 text-[10px] font-semibold uppercase leading-4 tracking-[0.15em] text-[#575147]">
        {label}
      </p>
    </div>
  );
}
