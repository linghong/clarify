import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { Chat } from "@/entities/Chat";
import { CustomJwtPayload } from "@/lib/auth";

type Params = Promise<{ id: string; lessonId: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { lessonId } = await params;
    const lessonIdInt = parseInt(lessonId);

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
    const chatRepository = dataSource.getRepository(Chat);
    const chats = await chatRepository.find({
      where: {
        lessonId: lessonIdInt
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

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id: courseId, lessonId } = await params;
    const courseIdInt = parseInt(courseId);
    const lessonIdInt = parseInt(lessonId);

    if (isNaN(courseIdInt) || isNaN(lessonIdInt)) {
      return NextResponse.json(
        { error: "Invalid course or lesson ID" },
        { status: 400 }
      );
    }

    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { message, role, resourceType, resourceId } = await request.json();

    const dataSource = await initializeDatabase();
    const courseRepository = dataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: {
        id: courseIdInt,
        userId: payload.userId
      }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const lessonRepository = dataSource.getRepository(Lesson);
    const lesson = await lessonRepository.findOne({
      where: { id: lessonIdInt, courseId: courseIdInt }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const chatRepository = dataSource.getRepository(Chat);
    const chat = chatRepository.create({
      lessonId: lessonIdInt,
      message,
      role,
      resourceType: resourceType || 'none',
      resourceId
    });

    console.log('Creating chat with:', {
      lessonId: lessonIdInt,
      message: message.substring(0, 100) + '...',
      role
    });

    await chatRepository.save(chat);

    return NextResponse.json({
      chat: {
        ...chat,
        courseId: parseInt(courseId)
      }
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}