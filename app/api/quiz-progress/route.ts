import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();
  console.log('Received POST /api/quiz-progress body:', body);
  const { quiz_id, user_id, answers, flagged, bookmarked, marked_for_review, start_time, question_id } = body;
  if (!quiz_id || !user_id) {
    return new Response(JSON.stringify({ error: 'quiz_id and user_id required' }), { status: 400 });
  }

  // Fetch existing progress if any
  const { data: existing, error: fetchError } = await supabase
    .from('quiz_progress')
    .select('*')
    .eq('quiz_id', quiz_id)
    .eq('user_id', user_id)
    .single();
  if (fetchError && fetchError.code !== 'PGRST116') {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  let newAnswers = {};
  if (existing && existing.answers) {
    newAnswers = { ...existing.answers };
  }
  // If answers is present, merge it in (for partial update)
  if (answers && typeof answers === 'object') {
    newAnswers = { ...newAnswers, ...answers };
  }

  // Only update flagged/bookmarked/marked_for_review if present
  const newFlagged = flagged !== undefined ? flagged : (existing?.flagged || {});
  const newBookmarked = bookmarked !== undefined ? bookmarked : (existing?.bookmarked || {});
  const newMarkedForReview = marked_for_review !== undefined ? marked_for_review : (existing?.marked_for_review || {});

  // Upsert progress
  const { data, error } = await supabase
    .from('quiz_progress')
    .upsert([
      {
        quiz_id,
        user_id,
        answers: newAnswers,
        flagged: newFlagged,
        bookmarked: newBookmarked,
        marked_for_review: newMarkedForReview,
        start_time: start_time || existing?.start_time,
        updated_at: new Date().toISOString(),
      }
    ], { onConflict: 'quiz_id,user_id' });
  console.log('Upsert result:', { data, error });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true, data }), { status: 200 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const quiz_id = searchParams.get('quiz_id');
  const user_id = searchParams.get('user_id');
  if (!quiz_id || !user_id) {
    return new Response(JSON.stringify({ error: 'quiz_id and user_id required' }), { status: 400 });
  }
  const { data, error } = await supabase
    .from('quiz_progress')
    .select('*')
    .eq('quiz_id', quiz_id)
    .eq('user_id', user_id)
    .single();
  if (error && error.code !== 'PGRST116') {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ data }), { status: 200 });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const { quiz_id, user_id } = body;
  if (!quiz_id || !user_id) {
    return new Response(JSON.stringify({ error: 'quiz_id and user_id required' }), { status: 400 });
  }
  const { error } = await supabase
    .from('quiz_progress')
    .delete()
    .eq('quiz_id', quiz_id)
    .eq('user_id', user_id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
} 