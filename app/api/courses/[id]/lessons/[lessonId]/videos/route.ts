import { NextRequest, NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { Lesson, VideoResource } from "@/entities/Lesson";
import type { CustomJwtPayload } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id: courseId, lessonId } = await params;

    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { name, url } = await request.json();

    if (!name?.trim() || !url?.trim()) {
      return NextResponse.json(
        { error: "Valid name and URL are required" },
        { status: 400 }
      );
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
    const lesson = await lessonRepository.findOne({
      where: { id: parseInt(lessonId), courseId: parseInt(courseId) }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const videoRepository = dataSource.getRepository(VideoResource);

    // Check for existing video with same name in this lesson
    const existingVideo = await videoRepository.findOne({
      where: {
        lessonId: parseInt(lessonId),
        name: name
      }
    });

    if (existingVideo) {
      return NextResponse.json(
        { error: "A video with this name already exists in this lesson" },
        { status: 409 }
      );
    }

    const videoResource = videoRepository.create({
      lessonId: parseInt(lessonId),
      name,
      url
    });

    await videoRepository.save(videoResource);

    return NextResponse.json({ success: true, video: videoResource });

  } catch (error) {
    console.error('Error creating video resource:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { lessonId } = await params;

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
    const videoRepository = dataSource.getRepository(VideoResource);
    const videos = await videoRepository.find({
      where: {
        lessonId: parseInt(lessonId),
      },
      order: {
        createdAt: "DESC"
      }
    });

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}