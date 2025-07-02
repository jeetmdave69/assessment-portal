import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });

  const { data, error } = await supabase
    .from('exm_list')
    .select('*')
    .eq('user_id', userId)
    .order('exid');
  if (error) return NextResponse.json({ error: 'Failed to fetch exams.' }, { status: 500 });
  return NextResponse.json({ exams: data });
} 