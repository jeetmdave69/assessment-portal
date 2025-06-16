import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function generateAccessCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function POST(req: NextRequest) {
  // 🔁 Move Supabase client inside POST to avoid build-time env errors
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();
    const {
      quizTitle,
      duration,
      totalMarks,
      quizDateTime,
      quizExpiry,
      shuffleQuestions,
      shuffleOptions,
      maxAttempts,
      previewMode,
      questions,
      status,
    } = body;

    if (
      !quizTitle ||
      !duration ||
      !quizDateTime ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing required quiz data.' },
        { status: 400 }
      );
    }

    const accessCode = generateAccessCode();

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([
        {
          title: quizTitle,
          duration,
          total_marks: totalMarks,
          start_time: quizDateTime,
          end_time: quizExpiry,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          max_attempts: maxAttempts,
          preview_mode: previewMode,
          access_code: accessCode,
          status,
        },
      ])
      .select()
      .single();

    if (quizError) {
      throw quizError;
    }

    for (const q of questions) {
      const { data: insertedQuestion, error: questionError } = await supabase
        .from('questions')
        .insert([
          {
            quiz_id: quiz.id,
            question_text: q.question,
            image: q.image || null,
            explanation: q.explanation || '',
          },
        ])
        .select()
        .single();

      if (questionError) {
        throw questionError;
      }

      for (const opt of q.options) {
        const { error: optionError } = await supabase.from('options').insert([
          {
            question_id: insertedQuestion.id,
            text: opt.text,
            image: opt.image || null,
            is_correct: opt.isCorrect,
          },
        ]);

        if (optionError) {
          throw optionError;
        }
      }
    }

    return NextResponse.json(
      {
        message: 'Quiz created successfully',
        accessCode,
        quizId: quiz.id,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Create Quiz Error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
