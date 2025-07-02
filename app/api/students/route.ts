import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const { data, error } = await supabase.from('student').select('*').order('id');
  if (error) return NextResponse.json({ error: 'Failed to fetch students.' }, { status: 500 });
  return NextResponse.json({ students: data });
} 