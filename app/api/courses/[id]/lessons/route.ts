import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { CustomJwtPayload } from "@/lib/auth";

// GET - List all lessons for a course
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await context.params;

    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await initializeDatabase();
    const lessonRepository = AppDataSource.getRepository(Lesson);
    const lessons = await lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.pdfResources', 'pdfResources')
      .leftJoinAndSelect('lesson.videoResources', 'videoResources')
      .where('lesson.courseId = :courseId', { courseId: parseInt(courseId) })
      .orderBy('lesson.order', 'ASC')
      .getMany();

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new lesson
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await context.params;
    const { title, description } = await request.json();

    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await initializeDatabase();
    const courseRepository = AppDataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: { id: parseInt(courseId), userId: payload.userId }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const lessonRepository = AppDataSource.getRepository(Lesson);

    // Get the highest order number
    const lastLesson = await lessonRepository.findOne({
      where: { courseId: parseInt(courseId) },
      order: { order: 'DESC' }
    });
    const newOrder = (lastLesson?.order ?? 0) + 1;

    const lesson = lessonRepository.create({
      courseId: parseInt(courseId),
      title,
      description,
      order: newOrder
    });

    await lessonRepository.save(lesson);

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}