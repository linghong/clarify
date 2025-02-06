import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { Lesson } from "@/entities/Lesson";
import { CustomJwtPayload } from "@/lib/auth";

// GET - Get a specific lesson with its resources
export async function GET(
  request: Request,
  context: { params: { id: string, lessonId: string } }
) {
  try {
    const { id: courseId, lessonId } = context.params;

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
    const lesson = await lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.pdfResources', 'pdfResources')
      .leftJoinAndSelect('lesson.videoResources', 'videoResources')
      .where('lesson.id = :lessonId', { lessonId: parseInt(lessonId) })
      .andWhere('lesson.courseId = :courseId', { courseId: parseInt(courseId) })
      .getOne();

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update a specific lesson
export async function PUT(
  request: Request,
  context: { params: { id: string, lessonId: string } }
) {
  try {
    const { id: courseId, lessonId } = context.params;
    const { title, description, order } = await request.json();

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
    const lesson = await lessonRepository.findOne({
      where: {
        id: parseInt(lessonId),
        courseId: parseInt(courseId)
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Update lesson properties
    if (title) lesson.title = title;
    if (description) lesson.description = description;
    if (order) lesson.order = order;

    await lessonRepository.save(lesson);

    return NextResponse.json({ lesson });
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific lesson
export async function DELETE(
  request: Request,
  context: { params: { id: string, lessonId: string } }
) {
  try {
    const { id: courseId, lessonId } = context.params;

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
    const lesson = await lessonRepository.findOne({
      where: {
        id: parseInt(lessonId),
        courseId: parseInt(courseId)
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    await lessonRepository.remove(lesson);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}