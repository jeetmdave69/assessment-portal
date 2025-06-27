// types/quiz.ts

// Question Option Type
export interface QuizOption {
  id?: string; // Optional for client-side management
  text: string;
  image?: string | null;
  isCorrect: boolean;
  // For database operations
  image_url?: string | null;
  is_correct?: boolean;
}

// Question Type
export interface QuizQuestion {
  id?: string; // Optional for client-side management
  question: string;
  questionType: 'single' | 'multiple';
  question_type?: 'single' | 'multiple'; // For database compatibility
  image?: string | File | null;
  explanation?: string;
  marks: string | number;
  options: QuizOption[];
  // For database operations
  image_url?: string | null;
  quiz_id?: number;
  correct_answers?: number[]; // For database storage of correct option indices
}

// Quiz Section Type
export type QuizSection = 'qa' | 'lr' | 'va' | 'di' | 'gk';
export const QuizSectionEnum = {
  qa: 'Quantitative Aptitude',
  lr: 'Logical Reasoning',
  va: 'Verbal Ability',
  di: 'Data Interpretation',
  gk: 'General Knowledge',
} as const;

// Form Values Type
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
  questions: (QuizQuestion & { section_id: number })[];
}

// Database Quiz Type
export interface DatabaseQuiz {
  id: number;
  quiz_title: string;
  description: string | null;
  total_marks: number | null;
  duration: number | null;
  start_time: string;
  end_time: string;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  max_attempts: number | null;
  preview_mode: boolean;
  show_correct_answers: boolean;
  passing_score: number | null;
  access_code: string;
  is_draft: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Client-side Quiz Type (combines form values and database fields)
export interface Quiz extends Omit<DatabaseQuiz, 'start_time' | 'end_time'> {
  start_time: Date;
  end_time: Date;
  questions?: QuizQuestion[];
  status?: 'draft' | 'active' | 'upcoming' | 'completed';
}

// API Response Types
export interface QuizResponse {
  id: string;
  access_code: string;
}

// Statistics Type
export interface QuizStats {
  totalQuizzes: number;
  activeQuizzes: number;
  upcomingQuizzes: number;
  completedQuizzes: number;
  averageScore?: number;
  participationRate?: number;
}

// Helper function to get section name
export function getSectionName(section: QuizSection): string {
  return QuizSectionEnum[section];
}

// Type for CSV import/export
export interface QuizCSVRow {
  question: string;
  option1: string;
  option2: string;
  option3?: string;
  option4?: string;
  correct_answers: string; // comma-separated indices
  explanation?: string;
  marks: string;
  section_id: string;
}