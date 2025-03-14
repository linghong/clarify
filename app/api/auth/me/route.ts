// app/api/auth/me/route.ts
import "reflect-metadata";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import type { CustomJwtPayload } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { User } from "@/entities/User";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const dataSource = await initializeDatabase();
    const userRepository = dataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: payload.userId },
      select: ["id", "email", "name", "educationLevel", "major", "description", "age", "gender", "jobTitle", "yearsOfExperience"]
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user,
      firstLogin: user.firstLogin || false
    });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}