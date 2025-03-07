import "reflect-metadata";
import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { User } from "@/entities/User";
import { sign } from "jsonwebtoken";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const dataSource = await initializeDatabase();
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { email }
    });

    // Don't reveal if user exists or not for security reasons
    if (!user) {
      return NextResponse.json(
        { success: true, message: "If your email is registered, you will receive a password reset link" },
        { status: 200 }
      );
    }

    // Create a reset token
    const resetToken = sign(
      { userId: user.id, type: 'password-reset' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Store the reset token and expiry in the user record
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
    await userRepository.save(user);

    // Send email with reset link
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Please use the following link to reset your password: ${resetUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
            <h1 style="color: #333;">Reset Your Password</h1>
            <p>Hello,</p>
            <p>We received a request to reset your password for your Clarify account. Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
            <p>Regards,<br/>The Clarify Team</p>
          </div>
        `
      });

      // Log for debugging in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Reset URL: ${resetUrl}`);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      // Don't return an error to the client for security reasons
    }

    return NextResponse.json({
      success: true,
      message: "If your email is registered, you will receive a password reset link"
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 