import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { JwtPayload } from "jsonwebtoken";

interface UserPayload extends JwtPayload {
  id: number;
  email: string;
  name?: string;
}

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as UserPayload;
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await initializeDatabase();

    // First verify the course belongs to the user
    const courseRepository = AppDataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: {
        id: parseInt(params.courseId),
        userId: payload.id
      }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Then get the lessons with resources
    const lessonRepository = AppDataSource.getRepository(Lesson);
    const lessons = await lessonRepository.find({
      where: { courseId: parseInt(params.courseId) },
      relations: ["resources"],
      order: {
        order: "ASC"
      }
    });

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error("Error fetching lessons:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}