import { Clerk } from "@clerk/clerk-sdk-node";
import { NextRequest, NextResponse } from "next/server";

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function GET() {
  try {
    const allUsers = await clerk.users.getUserList();
    const admins = allUsers.filter((u: any) => u.publicMetadata?.role === "admin");
    return NextResponse.json({ count: admins.length });
  } catch (err: any) {
    return NextResponse.json({ count: 0, error: err.message }, { status: 500 });
  }
} 