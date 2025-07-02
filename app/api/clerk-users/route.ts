import { users } from "@clerk/clerk-sdk-node";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const allUsers = await users.getUserList({ limit, offset });
    const mapped = allUsers.map((u: any) => ({
      id: u.id,
      fname: u.firstName,
      lname: u.lastName,
      email: u.emailAddresses?.[0]?.emailAddress || '',
      role: u.publicMetadata?.role || '',
      created_at: u.createdAt || null,
    }));
    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json([], { status: 500 });
  }
} 