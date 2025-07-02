import { users } from "@clerk/clerk-sdk-node";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const allUsers = await users.getUserList();
    const admins = allUsers.filter((u: any) => u.publicMetadata?.role === "admin");
    const teachers = allUsers.filter((u: any) => u.publicMetadata?.role === "teacher");
    const students = allUsers.filter((u: any) => u.publicMetadata?.role === "student");
    return NextResponse.json({
      adminCount: admins.length,
      teacherCount: teachers.length,
      studentCount: students.length,
    });
  } catch (err: any) {
    return NextResponse.json({ adminCount: 0, teacherCount: 0, studentCount: 0, error: err.message }, { status: 500 });
  }
} 