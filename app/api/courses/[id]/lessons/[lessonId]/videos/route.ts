import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { VideoResource } from "@/entities/VideoResource";
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

    const { name, url } = await request.json();

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

    const videoResourceRepository = AppDataSource.getRepository(VideoResource);
    const videoResource = videoResourceRepository.create({
      courseId: parseInt(courseId),
      lessonId: parseInt(lessonId),
      name,
      url
    });

    await videoResourceRepository.save(videoResource);

    return NextResponse.json({ videoResource });
  } catch (error) {
    console.error('Error creating video resource:', error);
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
    const videoRepository = AppDataSource.getRepository(VideoResource);
    const videos = await videoRepository.find({
      where: {
        courseId,
        lessonId
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