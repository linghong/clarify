import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { User } from "@/entities/User";
import { createToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Initialize database connection
    await initializeDatabase();
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const userRepository = AppDataSource.getRepository(User);

    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Create new user
    const user = new User();
    user.email = email;
    user.password = password;
    user.name = name;
    await user.hashPassword();

    await userRepository.save(user);

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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}