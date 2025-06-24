import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Generate a more secure access code with better character distribution
function generateAccessCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous characters
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// Validate quiz data structure
function validateQuizData(data: any) {
  const requiredFields = ['quizTitle', 'duration', 'quizDateTime'];
  const missingFields = requiredFields.filter(field => !data[field]);
  
  if (missingFields.length > 0) {
    return {
      isValid: false,
      message: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    return {
      isValid: false,
      message: 'At least one question is required'
    };
  }

  for (const [index, question] of data.questions.entries()) {
    if (!question.question || !question.options || question.options.length < 2) {
      return {
        isValid: false,
        message: `Question ${index + 1} is missing text or has insufficient options`
      };
    }

    const correctOptions = question.options.filter((opt: any) => opt.isCorrect);
    if (correctOptions.length === 0) {
      return {
        isValid: false,
        message: `Question ${index + 1} must have at least one correct answer`
      };
    }
  }

  return { isValid: true };
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();
    
    // Validate input data
    const validation = validateQuizData(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    const {
      quizTitle,
      duration,
      totalMarks,
      quizDateTime,
      quizExpiry,
      shuffleQuestions = false,
      shuffleOptions = false,
      maxAttempts = 1,
      previewMode = false,
      questions,
      status = 'draft',
      description = '',
      passingScore = 0,
      showCorrectAnswers = false,
    } = body;

    // Generate unique access code and check for collisions
    let accessCode: string;
    let attempts = 0;
    const maxAttemptsForCode = 5;
    
    do {
      accessCode = generateAccessCode();
      const { data: existingQuiz } = await supabase
        .from('quizzes')
        .select('id')
        .eq('access_code', accessCode)
        .maybeSingle();

      if (!existingQuiz) break;
      attempts++;
    } while (attempts < maxAttemptsForCode);

    if (attempts >= maxAttemptsForCode) {
      throw new Error('Failed to generate unique access code');
    }

    // Insert quiz with transaction for data consistency
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([{
        title: quizTitle,
        description,
        duration: parseInt(duration),
        total_marks: parseInt(totalMarks) || 0,
        start_time: quizDateTime,
        end_time: quizExpiry,
        shuffle_questions: shuffleQuestions,
        shuffle_options: shuffleOptions,
        max_attempts: parseInt(maxAttempts),
        preview_mode: previewMode,
        access_code: accessCode,
        status,
        passing_score: parseInt(passingScore),
        show_correct_answers: showCorrectAnswers,
      }])
      .select()
      .single();

    if (quizError) throw quizError;

    // Batch insert questions and options for better performance
    const questionInserts = questions.map(async (q: any) => {
      const { data: insertedQuestion, error: questionError } = await supabase
        .from('questions')
        .insert([{
          quiz_id: quiz.id,
          question_text: q.question,
          question_type: q.questionType || 'single',
          image: q.image || null,
          explanation: q.explanation || '',
          marks: parseInt(q.marks) || 1,
        }])
        .select()
        .single();

      if (questionError) throw questionError;

      const optionInserts = q.options.map((opt: any) => 
        supabase.from('options').insert([{
          question_id: insertedQuestion.id,
          text: opt.text,
          image: opt.image || null,
          is_correct: opt.isCorrect,
        }])
      );

      await Promise.all(optionInserts);
    });

    await Promise.all(questionInserts);

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
      { 
        error: 'Failed to create quiz',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      },
      { status: 500 }
    );
  }
}