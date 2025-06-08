// app/api/save-quiz/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Insert quiz data
    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        title: data.quizTitle,
        duration: data.duration,
        total_marks: data.totalMarks,
        quiz_datetime: data.quizDateTime,
        expiry_datetime: data.quizExpiry,
        shuffle_questions: data.shuffleQuestions,
        shuffle_options: data.shuffleOptions,
        max_attempts: data.maxAttempts,
        preview_mode: data.previewMode,
        access_code: data.accessCode,
        status: data.status,
      })
      .select()
      .single();

    if (error) throw error;

    // Insert questions (you may want to map and format properly)
    for (const q of data.questions) {
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert({
          quiz_id: quiz.id,
          question_text: q.question,
          explanation: q.explanation || '',
          image_url: q.image || null,
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Insert options
      for (const opt of q.options) {
        const { error: optionError } = await supabase.from('options').insert({
          question_id: questionData.id,
          text: opt.text,
          is_correct: opt.isCorrect,
          image_url: opt.image || null,
        });
        if (optionError) throw optionError;
      }
    }

    return NextResponse.json({ message: 'Quiz saved successfully!' });
  } catch (error) {
    console.error('Save quiz error:', error);
    return NextResponse.json({ error: 'Failed to save quiz' }, { status: 500 });
  }
}
