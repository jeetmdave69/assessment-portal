import { users } from "@clerk/clerk-sdk-node";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    // Get the current user making the request
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the current user's role from Clerk
    const currentUser = await users.getUser(userId);
    const currentRole = currentUser.publicMetadata?.role;
    if (currentRole !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Only admins can change roles." }, { status: 403 });
    }

    const { id, role } = await req.json();

    // Prevent admin from changing their own role
    if (id === userId) {
      return NextResponse.json({ success: false, error: "Admins cannot change their own role." }, { status: 400 });
    }

    await users.updateUser(id, {
      publicMetadata: { role }
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
} 