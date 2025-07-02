import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { exid, questions } = await req.json();

  if (!exid || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: 'Invalid data.' }, { status: 400 });
  }

  // Prepare insert data
  const insertData = questions.map((q, i) => ({
    exid,
    qstn: q.q,
    qstn_o1: q.o1,
    qstn_o2: q.o2,
    qstn_o3: q.o3,
    qstn_o4: q.o4,
    qstn_ans: q.a,
    sno: i + 1,
  }));

  const { error } = await supabase.from('qstn_list').insert(insertData);

  if (error) {
    return NextResponse.json({ error: 'Updating questions failed.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 