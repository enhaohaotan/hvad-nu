import type { LearningSession } from "../types";

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
    content: () => (
      <>
        Nogle passagerer mener, at reglerne er tydelige: Ingen samtaler, ingen
        notifikationslyde og helst heller ingen knitrende madpakker. Andre
        opfatter kupéen mere som en opfordring til at tage hensyn. En kort
        hvisken til sidemanden er, efter deres mening, ikke et problem.
      </>
    ),
  },
  {
    id: "p3",
    content: () => (
      <>
        Konflikten opstår ofte, fordi normen ikke kun handler om lydniveau.
        Den handler også om vores forventninger til hinanden. Når én person
        tysser på en anden, kan det opleves som nødvendig hjælp eller som en
        unødvendig irettesættelse. Derfor kan en lille lyd hurtigt blive til et
        spørgsmål om, hvem der har ret til at sætte grænsen.
      </>
    ),
  },
  {
    id: "p4",
    content: () => (
      <>
        Trafikselskaberne forsøger at løse problemet med skilte og venlige
        påmindelser. Alligevel kan ingen regel beskrive alle situationer. Et
        barn, der græder, er ikke det samme som en voksen, der ser video uden
        høretelefoner. Vi er nødt til at skelne mellem forskellige former for
        støj.
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
  onContinue: () => void;
  session: LearningSession;
};

export function ReadingSection({
  onContinue,
  session,
}: ReadingSectionProps) {
  return (
    <section
      className="border-b-2 border-[#0b4a47]"
      aria-label="Dagens læsning"
    >
      <article className="py-9 lg:py-12">
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
            <p key={paragraph.id}>{paragraph.content()}</p>
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
    </section>
  );
}
