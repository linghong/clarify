import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { User } from "@/entities/User";
import { createToken, validatePassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Initialize database connection
    await initializeDatabase();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user || !(await validatePassword(user, password))) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = await createToken(user);
    
    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}