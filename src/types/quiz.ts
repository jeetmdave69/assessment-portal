// types/quiz.ts
export interface QuizOption {
  text: string;
  image?: string | null;
  isCorrect: boolean;
}

export interface QuizQuestion {
  question: string;
  questionType: 'single' | 'multiple';
  image?: string | null;
  explanation?: string;
  marks: string;
  options: QuizOption[];
}

export interface QuizFormValues {
  quizTitle: string;
  description: string;
  totalMarks: string;
  duration: string;
  startDateTime: Date;
  expiryDateTime: Date;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  maxAttempts: string;
  previewMode: boolean;
  showCorrectAnswers: boolean;
  passingScore: string;
  questions: QuizQuestion[];
}