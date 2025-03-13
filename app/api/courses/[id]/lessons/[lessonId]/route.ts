import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { Lesson, PdfResource, VideoResource, Chat } from "@/entities/Lesson";
import { Message } from "@/entities/Message";
import { Note } from "@/entities/Note";
import { VideoBookmark } from "@/entities/VideoBookmark";
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
    const { id, lessonId } = await params;

    // Get user authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get request body with status
    const { status } = await request.json();

    // Validate status value
    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const dataSource = await initializeDatabase();
    const lessonRepository = dataSource.getRepository(Lesson);

    // Find the lesson
    const lesson = await lessonRepository.findOne({
      where: {
        id: parseInt(lessonId),
        courseId: parseInt(id),
      }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    // Update the status and timestamps
    lesson.status = status;

    // Update lastAccessedAt if not already set and status is not "not_started"
    if (status !== 'not_started' && !lesson.lastAccessedAt) {
      lesson.lastAccessedAt = new Date();
    }

    // Save the updated lesson
    await lessonRepository.save(lesson);

    return NextResponse.json({ success: true, lesson });
  } catch (error) {
    console.error('Error updating lesson status:', error);
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
    let filesToDelete = {
      pdfs: [] as PdfResource[],
      videos: [] as VideoResource[]
    };

    // Use transaction to ensure all operations succeed or fail together
    await dataSource.transaction(async (transactionalEntityManager) => {
      const lessonRepository = transactionalEntityManager.getRepository(Lesson);
      const pdfRepository = transactionalEntityManager.getRepository(PdfResource);
      const videoRepository = transactionalEntityManager.getRepository(VideoResource);
      const chatRepository = transactionalEntityManager.getRepository(Chat);
      const messageRepository = transactionalEntityManager.getRepository(Message);
      const noteRepository = transactionalEntityManager.getRepository(Note);
      const videoBookmarkRepository = transactionalEntityManager.getRepository(VideoBookmark);

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

      // 5. Find and delete all video resources
      const videos = await videoRepository.find({
        where: { lessonId: parseInt(lessonId) }
      });

      // Delete associated notes
      await noteRepository.delete({
        lessonId: parseInt(lessonId)
      });

      // Delete video bookmarks for all videos in this lesson
      for (const video of videos) {
        await videoBookmarkRepository.delete({ videoId: video.id });
      }

      // Store the files to delete
      filesToDelete = {
        pdfs,
        videos
      };

      // Delete the resources from database
      if (pdfs.length > 0) {
        await pdfRepository.remove(pdfs);
      }

      if (videos.length > 0) {
        await videoRepository.remove(videos);
      }

      // 7. Finally delete the lesson
      await lessonRepository.remove(lesson);
    });

    return NextResponse.json({
      success: true,
      filesToDelete: {
        pdfs: filesToDelete.pdfs.map(pdf => pdf.url),
        videos: filesToDelete.videos.map(video => video.url)
      }
    });

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