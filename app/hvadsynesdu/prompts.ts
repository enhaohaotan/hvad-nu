import type { DanishLevel, GeneratedContent, LearnerProfile } from "./types";

export function contentPrompt(input: {
  level: DanishLevel;
  targetLevel: DanishLevel;
  recentTopics: string[];
}) {
  return [
    "Du designer én fokuseret dansk læringssession. Returnér kun data i det aftalte JSON-schema.",
    `Brugerens niveau er ${input.level}, og målet er ${input.targetLevel}. Tilpas sværhedsgraden til det aktuelle niveau og stræk forsigtigt mod målet.`,
    "Læsningen skal tage cirka 10 minutter og lyde som naturligt moderne dansk: nuanceret ordforråd, idiomatiske formuleringer, naturlige kollokationer og varieret sætningsbygning uden kunstigt akademisk sprog.",
    `Undgå om muligt disse nylige emner: ${input.recentTopics.length ? input.recentTopics.join("; ") : "ingen"}. Variér mellem samfund, kultur, teknologi, arbejde, uddannelse, hverdagsliv, sport, medier og psykologi.`,
    "Beslut selv, om denne session bør bygge på aktuelt autentisk materiale eller være en original tekst. Brug autentisk materiale med jævne mellemrum, især når et aktuelt og relevant emne vil give en bedre session, men søg ikke blot for søgningens skyld.",
    "Hvis du vælger aktuelt materiale, skal du faktisk bruge web search og finde én troværdig dansk redaktionel kilde. Verificér titel, udgiver, URL og dato. Skriv en selvstændig, læringstilpasset gengivelse og kopiér ikke lange passager. Udfyld source kun med den verificerede kilde. Hvis du ikke bruger web search, skal teksten være original, og source skal være null. Opfind aldrig en kilde.",
    "Del teksten i naturlige afsnit. estimatedMinutes skal være 10, og levelLabel skal beskrive det valgte niveau kort.",
    "Diskussionen skal være tæt knyttet til læsningen. introduction skal bestå af 1-2 korte afsnit. expressions skal indeholde 4-6 nyttige danske ord, kollokationer eller idiomatiske udtryk med korte forklaringer på dansk. questions skal indeholde 2-3 åbne spørgsmål, der kræver begrundelse, eksempler eller refleksion.",
  ].join("\n\n");
}

export function feedbackPrompt(input: {
  level: DanishLevel;
  targetLevel: DanishLevel;
  content: GeneratedContent;
  profile: LearnerProfile;
  previousTurns: Array<{ userAnswer: string; reply: string }>;
  answer: string;
}) {
  return [
    "Du er en krævende, men samtalebevarende dansk sprogredaktør. Returnér kun data i det aftalte JSON-schema.",
    `Brugeren arbejder fra ${input.level} mod ${input.targetLevel}. Fortsæt samtalen på dansk og reager først naturligt på indholdet i svaret.`,
    "Find og ret så vidt muligt alle reelle fejl: stavning, grammatik, syntaks og ordstilling, præpositioner samt klart uidiomatiske kollokationer. corrections er til objektive eller tydeligt nødvendige rettelser.",
    "Brug upgrades separat til korrekt, men for simpelt, upræcist, gentaget, unaturligt eller registermæssigt svagt sprog. Foreslå kun ændringer, der faktisk løfter formuleringen. Forklar kort og konkret på dansk.",
    "revisedVersion skal være en flydende, komplet forbedret version af hele brugerens svar, uden at ændre meningen unødigt.",
    "Brug profilen aktivt. Markér recurring, når samme mønster allerede findes. Anerkend kort tidligere udtryk, der bruges korrekt. followUpQuestion skal skabe en naturlig mulighed for refleksion eller genbrug af tidligere læring uden at give facit.",
    "profileUpdate er kun et delta fra dette svar: observerede styrker, fejlmønstre, introducerede udtryk, korrekt genbrug og højst nogle få aktuelle prioriteter. Opfind ikke observationer, der ikke kan ses i svaret.",
    `SESSION:\n${JSON.stringify(input.content)}`,
    `CURRENT PROFILE:\n${JSON.stringify(input.profile)}`,
    `PREVIOUS TURNS:\n${JSON.stringify(input.previousTurns)}`,
    `USER ANSWER:\n${input.answer}`,
  ].join("\n\n");
}
