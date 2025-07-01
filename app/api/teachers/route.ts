import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const { data, error } = await supabase.from('teacher').select('*').order('id');
  if (error) return NextResponse.json({ error: 'Failed to fetch teachers.' }, { status: 500 });
  return NextResponse.json({ teachers: data });
} 