import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { Chat } from "@/entities/Chat";
import { CustomJwtPayload } from "@/lib/auth";

export async function POST(
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

    const { message, role, resourceId, resourceType } = await request.json();

    await initializeDatabase();
    const courseRepository = AppDataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: { id: parseInt(courseId), userId: payload.userId }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const lessonRepository = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepository.findOne({
      where: { id: parseInt(lessonId), courseId: parseInt(courseId) }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const chatRepository = AppDataSource.getRepository(Chat);
    const chat = chatRepository.create({
      resourceId,
      message,
      role,
      resourceType
    });

    await chatRepository.save(chat);

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const params = await context.params;
    const courseId = parseInt(params.id);
    const lessonId = parseInt(params.lessonId);

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
    const chatRepository = AppDataSource.getRepository(Chat);
    const chats = await chatRepository.find({
      where: {
        resourceId: lessonId
      },
      order: {
        createdAt: 'ASC'
      }
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}