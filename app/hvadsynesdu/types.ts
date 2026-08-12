export type LearningSession = {
  id: string;
  date: string;
  title: string;
  answer?: string;
  updatedAt: number;
};

export type LearnerProfile = {
  level: string;
  updatedAt: number;
};
