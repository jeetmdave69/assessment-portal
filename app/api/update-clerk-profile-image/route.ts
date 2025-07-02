import { users } from '@clerk/clerk-sdk-node';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userId, imageUrl } = await req.json();
    if (!userId || !imageUrl) {
      return NextResponse.json({ error: 'Missing userId or imageUrl' }, { status: 400 });
    }
    await users.updateUser(userId, { imageUrl });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 