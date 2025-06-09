// src/types/quiz.ts
export interface Quiz {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  is_draft: boolean;
  status?: string;
  creator_id?: string;
  created_at?: string;
}
