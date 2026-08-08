export type SessionPhase = "reading" | "thinking" | "discussing" | "feedback";

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  question?: string;
};

export type SavedExpression = {
  id: string;
  expression: string;
  meaning: string;
  source: string;
  savedAt: number;
  timesReused: number;
};

export type SavedMistake = {
  id: string;
  pattern: string;
  correction: string;
  count: number;
  lastSeen: number;
};

export type LearningSession = {
  id: string;
  date: string;
  title: string;
  phase: SessionPhase;
  questionIndex: number;
  messages: ChatMessage[];
  completedAt?: number;
  updatedAt: number;
};

export type LearnerProfile = {
  level: string;
  updatedAt: number;
};

export type SaveExpression = (
  expression: string,
  meaning: string,
  source?: string,
) => void;
