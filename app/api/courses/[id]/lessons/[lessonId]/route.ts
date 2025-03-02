import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { Lesson, PdfResource, VideoResource, Chat } from "@/entities/Lesson";
import { Message } from "@/entities/Message";
import type { CustomJwtPayload } from "@/lib/auth";

// GET - Get a specific lesson with its resources
export async function GET(
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

    const dataSource = await initializeDatabase();
    const lessonRepository = dataSource.getRepository(Lesson);
    const lesson = await lessonRepository
      .createQueryBuilder('lesson')
      .leftJoinAndSelect('lesson.pdfResources', 'pdfResources')
      .leftJoinAndSelect('lesson.videoResources', 'videoResources')
      .where('lesson.id = :lessonId', { lessonId })
      .andWhere('lesson.courseId = :courseId', { courseId })
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id: courseId, lessonId } = await params;
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

    const dataSource = await initializeDatabase();
    const lessonRepository = dataSource.getRepository(Lesson);
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id: courseId, lessonId } = await params;

    const authHeader = request.headers.get("authorization");
    const cookieStore = await cookies();
    const token = authHeader?.split(" ")[1] || cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const dataSource = await initializeDatabase();

    // Use transaction to ensure all operations succeed or fail together
    await dataSource.transaction(async (transactionalEntityManager) => {
      const lessonRepository = transactionalEntityManager.getRepository(Lesson);
      const pdfRepository = transactionalEntityManager.getRepository(PdfResource);
      const videoRepository = transactionalEntityManager.getRepository(VideoResource);
      const chatRepository = transactionalEntityManager.getRepository(Chat);
      const messageRepository = transactionalEntityManager.getRepository(Message);

      // Find the lesson
      const lesson = await lessonRepository.findOne({
        where: {
          id: parseInt(lessonId),
          courseId: parseInt(courseId)
        }
      });

      if (!lesson) {
        throw new Error("Lesson not found");
      }

      // 1. Find all chats associated with this lesson
      const chats = await chatRepository.find({
        where: { lessonId: parseInt(lessonId) }
      });

      // 2. Delete all messages for these chats
      for (const chat of chats) {
        await messageRepository.delete({ chatId: chat.id });
      }

      // 3. Delete all chats
      if (chats.length > 0) {
        await chatRepository.remove(chats);
      }

      // 4. Find and delete all PDF resources
      const pdfs = await pdfRepository.find({
        where: { lessonId: parseInt(lessonId) }
      });

      if (pdfs.length > 0) {
        await pdfRepository.remove(pdfs);
      }

      // 5. Find and delete all video resources
      const videos = await videoRepository.find({
        where: { lessonId: parseInt(lessonId) }
      });

      // 6. Also delete video files from storage if necessary
      for (const video of videos) {
        const fileName = video.url.split('/').pop();
        if (fileName) {
          try {
            await fetch('http://127.0.0.1:8000/uploads/delete', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: fileName })
            });
          } catch (error) {
            console.warn(`Failed to delete video file: ${fileName}`, error);
            // Continue with deletion of database records even if file deletion fails
          }
        }
      }

      if (videos.length > 0) {
        await videoRepository.remove(videos);
      }

      // 7. Finally delete the lesson
      await lessonRepository.remove(lesson);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting lesson:', error);

    if (error instanceof Error && error.message === "Lesson not found") {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}