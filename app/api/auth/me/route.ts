// app/api/auth/me/route.ts
import "reflect-metadata";
import { NextResponse } from "next/server";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { User } from "@/entities/User";
import { verifyToken } from "@/lib/auth";
import { CustomJwtPayload } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = await verifyToken(token) as CustomJwtPayload;
      if (!decoded || !decoded.userId) {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 401 }
        );
      }

      await initializeDatabase();
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: decoded.userId },
        select: ["id", "email", "name"]
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ user });
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}