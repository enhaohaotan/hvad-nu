export const TRANSLATION_LANGUAGES = {
  en: "English",
  zh: "中文",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  nl: "Nederlands",
  sv: "Svenska",
  no: "Norsk",
  pl: "Polski",
  uk: "Українська",
  ru: "Русский",
  tr: "Türkçe",
  ja: "日本語",
  ko: "한국어",
  ar: "العربية",
  hi: "हिन्दी",
} as const;

export type TranslationLanguage = keyof typeof TRANSLATION_LANGUAGES;

export function isTranslationLanguage(
  value: string,
): value is TranslationLanguage {
  return value in TRANSLATION_LANGUAGES;
}
