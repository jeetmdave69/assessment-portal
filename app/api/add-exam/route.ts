import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { exname, nq, desp, subt, extime, subject } = await req.json();

  if (!exname || !nq || !desp || !subt || !extime || !subject) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const { error } = await supabase.from('exm_list').insert([
    { exname, nq, desp, subt, extime, subject }
  ]);

  if (error) {
    return NextResponse.json({ error: 'Adding exam failed.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 