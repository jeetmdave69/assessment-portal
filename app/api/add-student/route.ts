import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { fname, uname, dob, gender, email, pword, cpword } = await req.json();

  if (pword !== cpword) {
    return NextResponse.json({ error: 'Password did not match.' }, { status: 400 });
  }

  // Check if username exists
  const { count } = await supabase
    .from('student')
    .select('uname', { count: 'exact', head: true })
    .eq('uname', uname);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Username already exists.' }, { status: 400 });
  }

  // Insert new student
  const { error } = await supabase.from('student').insert([
    {
      uname,
      pword, // In production, hash the password!
      fname,
      dob,
      gender,
      email,
    },
  ]);

  if (error) {
    return NextResponse.json({ error: 'Student registration failed.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 