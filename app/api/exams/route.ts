import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const { data, error } = await supabase.from('exm_list').select('*').order('exid');
  if (error) return NextResponse.json({ error: 'Failed to fetch exams.' }, { status: 500 });
  return NextResponse.json({ exams: data });
} 