import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { id, fname, email, dob, gender } = await req.json();
  if (!id || !fname || !email || !dob || !gender) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('teacher')
    .update({ fname, email, dob, gender })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Profile update failed.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 