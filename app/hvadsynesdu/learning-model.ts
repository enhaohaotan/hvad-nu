export const LEARNING_MODELS = {
  "gpt-5.6-luna": {
    label: "Luna",
    badge: "BILLIGST",
    description: "Hurtigst og billigst. God til hyppig brug, men kan give mindre nuanceret tekst og feedback.",
    inputPerMillionUsd: 0.2,
    outputPerMillionUsd: 1.2,
    generationDkk: [0.03, 0.05],
    feedbackDkk: [0.01, 0.03],
  },
  "gpt-5.6-terra": {
    label: "Terra",
    badge: "ANBEFALET",
    description: "Bedste balance mellem naturligt dansk, grundig feedback og pris.",
    inputPerMillionUsd: 2,
    outputPerMillionUsd: 12,
    generationDkk: [0.25, 0.45],
    feedbackDkk: [0.12, 0.3],
  },
  "gpt-5.6-sol": {
    label: "Sol",
    badge: "BEDST KVALITET",
    description: "Højeste kvalitet til krævende tekster og sproglig vurdering, men væsentligt dyrere.",
    inputPerMillionUsd: 5,
    outputPerMillionUsd: 30,
    generationDkk: [0.63, 1.13],
    feedbackDkk: [0.3, 0.75],
  },
} as const;

export type LearningModel = keyof typeof LEARNING_MODELS;
export const DEFAULT_LEARNING_MODEL: LearningModel = "gpt-5.6-terra";

export function isLearningModel(value: unknown): value is LearningModel {
  return typeof value === "string" && value in LEARNING_MODELS;
}
