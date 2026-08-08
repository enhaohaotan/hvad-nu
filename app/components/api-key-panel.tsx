export function ApiKeyPanel({
  apiKey,
  isInputVisible,
  isWorking,
  onChange,
  onForget,
}: {
  apiKey: string;
  isInputVisible: boolean;
  isWorking: boolean;
  onChange: (value: string) => void;
  onForget: () => void;
}) {
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
      <details className="mt-3 border-t border-[#29231b]/15 pt-2">
        <summary className="inline-block cursor-pointer list-none text-[10px] font-semibold uppercase tracking-[0.13em] text-[#575147] underline decoration-current/40 underline-offset-4 transition hover:text-[#9f211e] [&::-webkit-details-marker]:hidden">
          Se estimeret OpenAI-pris
        </summary>
        <div className="mt-2 overflow-hidden border border-[#29231b]/20">
          <p className="px-4 py-2 text-[10px] text-[#70695f]">
            Model: whisper-1 · 0,006 USD/min.
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
                <td className="px-4 py-2">ca. 0,79 kr.</td>
              </tr>
              <tr>
                <td className="px-4 py-2">40 min.</td>
                <td className="px-4 py-2">ca. 1,58 kr.</td>
              </tr>
              <tr>
                <td className="px-4 py-2">60 min.</td>
                <td className="px-4 py-2">ca. 2,37 kr.</td>
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
