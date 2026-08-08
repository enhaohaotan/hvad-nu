export const TRANSCRIPTION_MODES = {
  dual: {
    label: "Bedst samlet",
    badge: "Anbefalet",
    description:
      "gpt-transcribe skriver teksten, mens whisper-1 leverer tidskoder. Bedre nøjagtighed og fremhævning under afspilning.",
    modelKey: "gpt-transcribe+whisper-1",
    pricePerMinuteUsd: 0.0105,
    hasTimings: true,
  },
  gpt: {
    label: "Bedst tekst",
    badge: "",
    description:
      "Kun gpt-transcribe. Bedre nøjagtighed og laveste pris, men ingen fremhævning under afspilning.",
    modelKey: "gpt-transcribe",
    pricePerMinuteUsd: 0.0045,
    hasTimings: false,
  },
  whisper: {
    label: "Tidskoder med én model",
    badge: "",
    description:
      "Kun whisper-1. Fremhævning under afspilning, men lavere nøjagtighed end gpt-transcribe.",
    modelKey: "whisper-1",
    pricePerMinuteUsd: 0.006,
    hasTimings: true,
  },
} as const;

export type TranscriptionMode = keyof typeof TRANSCRIPTION_MODES;

export const DEFAULT_TRANSCRIPTION_MODE: TranscriptionMode = "dual";

export function isTranscriptionMode(value: string): value is TranscriptionMode {
  return value in TRANSCRIPTION_MODES;
}
