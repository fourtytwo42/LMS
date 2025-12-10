export interface Test {
  id: string;
  contentItemId: string;
  title: string;
  description?: string;
  passingScore: number;
  maxAttempts?: number;
  timeLimit?: number;
  showCorrectAnswers: boolean;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  questions: Question[];
}

export interface Question {
  id: string;
  testId?: string;
  repositoryId?: string;
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "FILL_BLANK";
  questionText: string;
  points: number;
  order: number;
  options?: Array<{ text: string; correct: boolean }>;
  correctAnswer?: boolean;
  correctAnswers?: string[];
  caseSensitive: boolean;
  blankPositions?: number[];
  explanation?: string;
}

export interface TestAttempt {
  id: string;
  userId: string;
  testId: string;
  attemptNumber: number;
  score?: number;
  pointsEarned: number;
  totalPoints: number;
  passed?: boolean;
  timeSpent: number;
  startedAt: Date;
  submittedAt?: Date;
  answers: TestAnswer[];
}

export interface TestAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  answerText?: string;
  selectedOptions?: number[];
  isCorrect?: boolean;
  pointsEarned: number;
}

