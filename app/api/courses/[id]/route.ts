import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { CustomJwtPayload } from "@/lib/auth";
import { Lesson, PdfResource, VideoResource, Chat } from "@/entities/Lesson";
import { Message } from "@/entities/Message";

// GET /api/courses/[id] - Get a specific course
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    if (isNaN(parseInt(courseId))) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
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

    const dataSource = await initializeDatabase();
    const courseRepository = dataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: {
        id: parseInt(courseId),
        userId: payload.userId
      },
      relations: ["lessons"]
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/courses/[id] - Update a course
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: courseId } = await params;

    if (isNaN(parseInt(courseId))) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
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

    const { name, description } = await request.json();

    const dataSource = await initializeDatabase();
    const courseRepository = dataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: {
        id: parseInt(courseId),
        userId: payload.userId
      }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    course.name = name;
    course.description = description;
    await courseRepository.save(course);

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a course and all its associated content
export async function DELETE(
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

    // Use a transaction to ensure all operations succeed or fail together
    await dataSource.transaction(async (transactionalEntityManager) => {
      const courseRepository = transactionalEntityManager.getRepository(Course);
      const lessonRepository = transactionalEntityManager.getRepository(Lesson);
      const pdfRepository = transactionalEntityManager.getRepository(PdfResource);
      const videoRepository = transactionalEntityManager.getRepository(VideoResource);
      const chatRepository = transactionalEntityManager.getRepository(Chat);
      const messageRepository = transactionalEntityManager.getRepository(Message);

      // Find the course and verify ownership
      const course = await courseRepository.findOne({
        where: {
          id: parseInt(courseId),
          userId: payload.userId
        }
      });

      if (!course) {
        throw new Error("Course not found or you don't have permission to delete it");
      }

      // Get all lessons for this course
      const lessons = await lessonRepository.find({
        where: { courseId: parseInt(id) }
      });

      // For each lesson, delete all associated resources
      for (const lesson of lessons) {
        // 1. Find all chats associated with this lesson
        const chats = await chatRepository.find({
          where: { lessonId: lesson.id }
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
          where: { lessonId: lesson.id }
        });

        if (pdfs.length > 0) {
          await pdfRepository.remove(pdfs);
        }

        // 5. Find and delete all video resources
        const videos = await videoRepository.find({
          where: { lessonId: lesson.id }
        });

        // 6. Delete video files from storage if necessary
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
              // Continue with deletion even if file deletion fails
            }
          }
        }

        if (videos.length > 0) {
          await videoRepository.remove(videos);
        }
      }

      // 7. Delete all lessons
      if (lessons.length > 0) {
        await lessonRepository.remove(lessons);
      }

      // 8. Finally delete the course
      await courseRepository.remove(course);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting course:', error);

    if (error instanceof Error && error.message.includes("Course not found")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error: " + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}