import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { VideoResource, Chat } from "@/entities/Lesson";
import { Message } from "@/entities/Message";
import type { CustomJwtPayload } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string; videoId: string }> }
) {
  try {
    const { lessonId, videoId } = await params;

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

    // Use a transaction to ensure all operations succeed or fail together
    await dataSource.transaction(async (transactionalEntityManager) => {
      const videoRepository = transactionalEntityManager.getRepository(VideoResource);
      const chatRepository = transactionalEntityManager.getRepository(Chat);
      const messageRepository = transactionalEntityManager.getRepository(Message);

      // Find and validate video
      const video = await videoRepository.findOne({
        where: {
          id: parseInt(videoId),
          lessonId: parseInt(lessonId),
        }
      });

      if (!video) {
        throw new Error("Video not found");
      }

      // Find all chats associated with this video
      const chats = await chatRepository.find({
        where: {
          resourceType: 'video',
          resourceId: parseInt(videoId)
        }
      });

      // Delete messages for each chat
      for (const chat of chats) {
        await messageRepository.delete({ chatId: chat.id });
      }

      // Delete the chats
      if (chats.length > 0) {
        await chatRepository.remove(chats);
      }

      // Delete the video
      await videoRepository.remove(video);

      // Delete file from local server
      // Assuming the video URL contains the filename
      const fileName = video.url.split('/').pop();
      if (fileName) {
        const localDeleteResponse = await fetch('http://127.0.0.1:8000/uploads/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: fileName })
        });

        if (!localDeleteResponse.ok) {
          const error = await localDeleteResponse.json();
          throw new Error(error.error || 'Failed to delete file from storage');
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);

    if (error instanceof Error && error.message === "Video not found") {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}