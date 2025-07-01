import { Clerk } from "@clerk/clerk-sdk-node";
import { NextRequest, NextResponse } from "next/server";

const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY! });

export async function POST(req: NextRequest) {
  const { email, password, role, firstName, lastName, username } = await req.json();

  if (!email || !password || !role || !firstName || !lastName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const user = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName,
      lastName,
      username,
      publicMetadata: { role },
    });
    // Optionally, send invitation email:
    // await clerk.users.sendEmailInvitation({ userId: user.id });
    return NextResponse.json({ message: "User created successfully", user });
  } catch (error: any) {
    // Log and return detailed error info
    let details = error?.errors || error?.response?.data || error;
    console.error("Clerk user creation error:", details);
    let message = error?.message || (Array.isArray(details) && details[0]?.message) || JSON.stringify(details);
    return NextResponse.json({ message: "Error", error: message, details }, { status: 422 });
  }
} 