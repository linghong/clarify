import "reflect-metadata";
import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { User } from "@/entities/User";
import { verify } from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    const dataSource = await initializeDatabase();
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Verify the token
    let decoded;
    try {
      decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string; type: string };
    } catch (error) {
      console.error("Token verification error:", error);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    if (decoded.type !== 'password-reset') {
      return NextResponse.json(
        { error: "Invalid token type" },
        { status: 400 }
      );
    }

    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: {
        id: parseInt(decoded.userId),
        resetToken: token
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found or token invalid" },
        { status: 404 }
      );
    }

    // Check if token is expired
    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      return NextResponse.json(
        { error: "Reset token has expired" },
        { status: 400 }
      );
    }

    // Update password
    user.password = password;
    await user.hashPassword();

    // Clear reset token fields
    user.resetToken = null;
    user.resetTokenExpiry = null;

    await userRepository.save(user);

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully"
    });
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 