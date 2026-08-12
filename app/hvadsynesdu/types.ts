export const LEVELS = ["0", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type DanishLevel = (typeof LEVELS)[number];

export const LANGUAGE_CATEGORIES = [
  "orthography",
  "grammar",
  "syntax-and-word-order",
  "prepositions",
  "idiomaticity-and-collocation",
  "vocabulary-and-precision",
  "register-and-tone",
  "variation-and-style",
  "cohesion-and-structure",
] as const;
export type LanguageCategory = (typeof LANGUAGE_CATEGORIES)[number];

export type SourceInfo = {
  publisher: string;
  title: string;
  url: string;
  publishedAt: string;
  adaptationNote: string;
};

export type GeneratedContent = {
  reading: {
    category: string;
    title: string;
    estimatedMinutes: number;
    levelLabel: string;
    paragraphs: string[];
    source: SourceInfo | null;
  };
  discussion: {
    title: string;
    introduction: string[];
    expressions: Array<{ expression: string; explanation: string }>;
    questions: string[];
  };
};

export type FeedbackResult = {
  reply: string;
  corrections: Array<{
    category: LanguageCategory;
    original: string;
    corrected: string;
    explanation: string;
    recurring: boolean;
  }>;
  upgrades: Array<{
    category: LanguageCategory;
    original: string;
    improved: string;
    explanation: string;
  }>;
  revisedVersion: string;
  followUpQuestion: string;
  profileUpdate: {
    estimatedWritingLevel: string | null;
    strengthsObserved: string[];
    patternsObserved: Array<{
      category: LanguageCategory;
      pattern: string;
      guidance: string;
    }>;
    expressionsIntroduced: Array<{
      expression: string;
      explanation: string;
    }>;
    expressionsUsedCorrectly: string[];
    currentPriorities: string[];
  };
};

export type ConversationTurn = {
  id: string;
  createdAt: number;
  userAnswer: string;
  feedback: FeedbackResult;
};

export type LearningSession = {
  id: string;
  createdAt: number;
  dateKey: string;
  level: DanishLevel;
  content: GeneratedContent;
  conversation: ConversationTurn[];
  draft: string;
};

export type LearnerProfile = {
  version: 1;
  updatedAt: number;
  selectedLevel: DanishLevel;
  targetLevel: DanishLevel;
  estimatedWritingLevel: string;
  strengths: string[];
  recurringPatterns: Array<{
    category: LanguageCategory;
    pattern: string;
    guidance: string;
    count: number;
    lastSeen: number;
  }>;
  activeExpressions: Array<{
    expression: string;
    explanation: string;
    introducedCount: number;
    successfulUses: number;
  }>;
  currentPriorities: string[];
};

export type SessionStore = {
  version: 2;
  activeSessionId: string | null;
  generationCount: number;
  sessions: LearningSession[];
};
