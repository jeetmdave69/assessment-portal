import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { fname, feedback } = await req.json();

  if (!fname || !feedback) {
    return NextResponse.json({ error: 'Name and feedback are required.' }, { status: 400 });
  }

  const { error } = await supabase.from('message').insert([
    { fname, feedback }
  ]);

  if (error) {
    return NextResponse.json({ error: 'Message send failed.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 