import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import type { CustomJwtPayload } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { User } from "@/entities/User";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";

export async function POST() {
  try {
    // Get token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token and get user ID
    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Initialize database connection
    const dataSource = await initializeDatabase();
    const userRepository = dataSource.getRepository(User);
    const courseRepository = dataSource.getRepository(Course);
    const lessonRepository = dataSource.getRepository(Lesson);

    // Find user
    const user = await userRepository.findOne({
      where: { id: payload.userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Create sample course
    const course = courseRepository.create({
      name: "Getting Started with Clarify",
      description: "Learn how to use Clarify to enhance your learning experience",
      userId: user.id,
    });

    await courseRepository.save(course);

    // Create sample lessons
    const lesson1 = lessonRepository.create({
      title: "Introduction to AI-assisted Learning",
      description: "Learn how AI can help you understand complex topics",
      courseId: course.id,
      order: 1,
    });

    await lessonRepository.save(lesson1);

    const lesson2 = lessonRepository.create({
      title: "Uploading and Analyzing Content",
      description: "How to upload PDFs and videos and get AI insights",
      courseId: course.id,
      order: 2,
    });

    await lessonRepository.save(lesson2);

    return NextResponse.json({
      success: true,
      course,
      lessons: [lesson1, lesson2]
    });

  } catch (error) {
    console.error("Error creating sample course:", error);
    return NextResponse.json(
      { error: "Failed to create sample course" },
      { status: 500 }
    );
  }
} 