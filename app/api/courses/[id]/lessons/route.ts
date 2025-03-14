import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { CustomJwtPayload } from "@/lib/auth";
import { NextRequest } from "next/server";

// GET - List all lessons for a course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    const authHeader = request.headers.get("authorization");
    const cookieStore = await cookies();
    const token = authHeader?.split(" ")[1] || cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const dataSource = await initializeDatabase();
    const lessonRepository = dataSource.getRepository(Lesson);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;
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

    const dataSource = await initializeDatabase();
    const courseRepository = dataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: { id: parseInt(courseId), userId: payload.userId }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const lessonRepository = dataSource.getRepository(Lesson);

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