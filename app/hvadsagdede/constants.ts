// Keep the legacy keys so existing visitors retain their API key and transcripts.
export const STORAGE_KEYS = {
  apiKey: "danish-listening-companion.openai-api-key",
  transcriptCache: "danish-listening-companion.transcripts.v1",
  transcriptionMode: "hvad-sagde-de:transcription-mode",
} as const;

export const GENSTART_REFERENCE_URL =
  "https://www.dr.dk/lyd/special-radio/genstart/genstart-2026/sort-mand-paa-plakaten-11802650176";
