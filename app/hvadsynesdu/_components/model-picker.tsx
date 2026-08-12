import { LEARNING_MODELS, type LearningModel } from "../learning-model";

export function ModelPicker({ model, disabled, onChange }: {
  model: LearningModel;
  disabled: boolean;
  onChange: (model: LearningModel) => void;
}) {
  const selected = LEARNING_MODELS[model];
  return (
    <details className="group mt-5 border-t border-[#29231b]/15 pt-2">
      <summary
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        onClick={(event) => { if (disabled) event.preventDefault(); }}
        onKeyDown={(event) => {
          if (disabled && (event.key === "Enter" || event.key === " ")) event.preventDefault();
        }}
        className={`inline-flex list-none items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#575147] transition [&::-webkit-details-marker]:hidden ${disabled ? "cursor-default opacity-55" : "cursor-pointer hover:text-[#0b4a47]"}`}
      >
        <span aria-hidden="true" className="h-0 w-0 shrink-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-current transition-transform group-open:rotate-90" />
        <span className="underline decoration-current/40 underline-offset-4">
          Vælg AI-model og se estimeret OpenAI-pris · {selected.label}
        </span>
      </summary>

      <fieldset className="mt-4" disabled={disabled}>
        <legend className="sr-only">Vælg AI-model</legend>
        <div className="mt-3 border border-[#29231b]/25">
          {Object.entries(LEARNING_MODELS).map(([value, option]) => {
            const isSelected = model === value;
            return (
              <label key={value} className={`grid gap-x-4 gap-y-1 border-b px-4 py-3 transition last:border-b-0 sm:grid-cols-[minmax(230px,auto)_1fr] sm:items-center ${isSelected ? "border-[#0b4a47] bg-[#0b4a47] text-[#f8f2e6]" : `border-[#29231b]/20 ${disabled ? "" : "hover:bg-[#eee7da]"}`} ${disabled ? "cursor-default opacity-55" : "cursor-pointer"}`}>
                <input type="radio" name="learning-model" value={value} checked={isSelected} onChange={() => onChange(value as LearningModel)} className="sr-only" />
                <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em]">
                  <span>{option.label}</span>
                  <span className={`text-[8px] tracking-[0.12em] ${isSelected ? "text-[#b7d0c8]" : "text-[#4d6e65]"}`}>{option.badge}</span>
                </span>
                <span className={`text-[11px] leading-4 ${isSelected ? "text-[#f8f2e6]/70" : "text-[#6b655b]"}`}>{option.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-3 overflow-hidden border border-[#29231b]/20">
        <p className="px-4 py-2 text-[10px] text-[#70695f]">
          {selected.label}: input ${formatPrice(selected.inputPerMillionUsd)} · output ${formatPrice(selected.outputPerMillionUsd)} pr. 1 mio. tokens
        </p>
        <table className="w-full table-fixed text-left text-xs text-[#575147]">
          <caption className="sr-only">Estimeret pris for en læringssession</caption>
          <thead className="bg-[#0b4a47]/5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#70695f]">
            <tr><th className="px-4 py-2" scope="col">Handling</th><th className="px-4 py-2" scope="col">Estimeret pris</th></tr>
          </thead>
          <tbody className="divide-y divide-[#29231b]/10">
            <tr><td className="px-4 py-2">Ny session</td><td className="px-4 py-2">ca. {formatRange(selected.generationDkk)} kr.</td></tr>
            <tr><td className="px-4 py-2">Ét feedbacksvar</td><td className="px-4 py-2">ca. {formatRange(selected.feedbackDkk)} kr.</td></tr>
          </tbody>
        </table>
        <p className="border-t border-[#29231b]/15 px-4 py-2 text-[10px] leading-4 text-[#70695f]">
          Skøn baseret på typisk tekstlængde og 1 USD ≈ 6,57 kr. Websøgning koster desuden ca. 0,07 kr. pr. kald plus kildetekstens tokens. Betales direkte til OpenAI. Den faktiske pris kan variere.
        </p>
      </div>
    </details>
  );
}

function formatPrice(value: number) {
  return value.toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRange(range: readonly [number, number]) {
  return `${range[0].toLocaleString("da-DK", { minimumFractionDigits: 2 })}–${range[1].toLocaleString("da-DK", { minimumFractionDigits: 2 })}`;
}
