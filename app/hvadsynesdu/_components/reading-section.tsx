import type { LearningSession, SavedExpression, SaveExpression } from "../types";

const ARTICLE = [
  {
    id: "p1",
    content: () => (
      <>
        Den stille kupé begyndte som et enkelt løfte: Her kunne man arbejde,
        læse eller bare kigge ud ad vinduet uden telefonsamtaler og høj musik.
        For mange pendlere blev den hurtigt et lille frirum midt i en travl
        hverdag. Men hvad betyder stilhed egentlig, når fyrre mennesker skal
        være enige om den?
      </>
    ),
  },
  {
    id: "p2",
    content: (onSave: SaveExpression) => (
      <>
        Nogle passagerer mener, at reglerne er tydelige: Ingen samtaler, ingen
        notifikationslyde og helst heller ingen knitrende madpakker. Andre
        opfatter kupéen mere som en opfordring til at{" "}
        <ExpressionButton expression="tage hensyn" meaning="vise omtanke for andre" onSave={onSave} />.
        En kort hvisken til sidemanden er, efter deres mening, ikke et problem.
      </>
    ),
  },
  {
    id: "p3",
    content: (onSave: SaveExpression) => (
      <>
        Konflikten opstår ofte, fordi normen ikke kun handler om lydniveau.
        Den handler også om vores forventninger til hinanden. Når én person
        tysser på en anden, kan det opleves som nødvendig hjælp eller som en
        unødvendig irettesættelse. Derfor kan en lille lyd hurtigt blive til et
        spørgsmål om, hvem der har ret til at{" "}
        <ExpressionButton expression="sætte grænsen" meaning="bestemme, hvad der er acceptabelt" onSave={onSave} />.
      </>
    ),
  },
  {
    id: "p4",
    content: (onSave: SaveExpression) => (
      <>
        Trafikselskaberne forsøger at løse problemet med skilte og venlige
        påmindelser. Alligevel kan ingen regel beskrive alle situationer. Et
        barn, der græder, er ikke det samme som en voksen, der ser video uden
        høretelefoner. Vi er nødt til at{" "}
        <ExpressionButton expression="skelne mellem" meaning="se forskel på to ting" onSave={onSave} />{" "}
        forskellige former for støj.
      </>
    ),
  },
  {
    id: "p5",
    content: () => (
      <>
        Måske er den stille kupé derfor ikke først og fremmest en test af,
        hvor stille vi kan være. Måske er den en test af, hvordan vi håndterer
        hinandens forskellige behov i et fælles rum — og om vi kan sige fra
        uden at gøre modparten til problemet.
      </>
    ),
  },
];

type ReadingSectionProps = {
  expressions: SavedExpression[];
  onContinue: () => void;
  onSaveExpression: SaveExpression;
  progress: number;
  session: LearningSession;
};

export function ReadingSection({
  expressions,
  onContinue,
  onSaveExpression,
  progress,
  session,
}: ReadingSectionProps) {
  return (
    <section
      className="grid border-b-2 border-[#0b4a47] lg:grid-cols-[minmax(0,1fr)_17rem]"
      aria-label="Dagens læsning"
    >
      <article className="py-9 lg:border-r lg:border-[#0b4a47]/45 lg:py-12 lg:pr-12">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#d9542b] sm:text-[11px]">
          <span>Samfund</span><span aria-hidden="true">·</span><span>9 min. læsning</span><span aria-hidden="true">·</span><span>B2–C1</span>
        </div>
        <h2 className="editorial-serif mt-4 max-w-4xl text-[2.55rem] leading-[0.96] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
          Er den stille kupé blevet for stille?
        </h2>
        <p className="editorial-serif mt-5 max-w-2xl border-l-2 border-[#d9542b] pl-4 text-lg italic leading-7 text-[#4f655f] sm:text-xl sm:leading-8">
          En fælles regel kan skabe ro — men også nye konflikter.
        </p>
        <div className="editorial-serif discussion-copy mt-9 max-w-3xl space-y-5 text-[17px] leading-[1.72] text-[#263a35] sm:mt-11 sm:text-xl sm:leading-[1.78]">
          {ARTICLE.map((paragraph) => (
            <p key={paragraph.id}>{paragraph.content(onSaveExpression)}</p>
          ))}
        </div>
        {session.phase === "reading" && (
          <button
            type="button"
            onClick={onContinue}
            className="mt-10 border-b-2 border-[#d9542b] pb-1 text-xs font-bold uppercase tracking-[0.15em] text-[#b84424] transition hover:text-[#0b4a47]"
          >
            Jeg har læst teksten →
          </button>
        )}
      </article>

      <aside className="py-7 lg:py-12 lg:pl-8">
        <div className="lg:sticky lg:top-7">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#5f756e]">Din session</p>
          <p className="editorial-serif mt-2 text-3xl">{progress}%</p>
          <div className="mt-3 h-1.5 bg-[#d5cbb7]" aria-label={`${progress} procent gennemført`}>
            <div className="h-full bg-[#d9542b] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <dl className="mt-7 grid grid-cols-2 gap-4 border-y border-[#0b4a47]/35 py-5 lg:grid-cols-1">
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#6a7d77]">Fokus</dt>
              <dd className="mt-1 text-sm leading-5">At udtrykke nuanceret uenighed</dd>
            </div>
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#6a7d77]">Gemte udtryk</dt>
              <dd className="mt-1 text-sm leading-5">{expressions.length} i dit sproglager</dd>
            </div>
            <div className="col-span-2 lg:col-span-1">
              <dt className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#6a7d77]">Genbrug i dag</dt>
              <dd className="editorial-serif mt-1 text-lg leading-5 text-[#b84424]">
                {expressions[0]?.expression ?? "Gem din første vending"}
              </dd>
            </div>
          </dl>
          <p className="mt-5 text-xs leading-5 text-[#657670]">
            Tryk på de <span className="border-b border-dashed border-[#d9542b] text-[#b84424]">markerede vendinger</span> i teksten for at gemme dem.
          </p>
        </div>
      </aside>
    </section>
  );
}

function ExpressionButton({
  expression,
  meaning,
  onSave,
}: {
  expression: string;
  meaning: string;
  onSave: SaveExpression;
}) {
  return (
    <button
      type="button"
      className="discussion-expression"
      title={`Gem “${expression}”`}
      onClick={() => onSave(expression, meaning)}
    >
      {expression}
    </button>
  );
}
