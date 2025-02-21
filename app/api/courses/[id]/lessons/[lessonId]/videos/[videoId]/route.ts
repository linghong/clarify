import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { VideoResource } from "@/entities/VideoResource";
import type { CustomJwtPayload } from "@/lib/auth";

type Params = Promise<{
  id: string;
  lessonId: string;
  videoId: string;
}>;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id: courseId, lessonId, videoId } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const dataSource = await initializeDatabase();
    const videoRepository = dataSource.getRepository(VideoResource);

    // Find and validate video
    const video = await videoRepository.findOne({
      where: {
        id: parseInt(videoId),
        lessonId: parseInt(lessonId),
        courseId: parseInt(courseId)
      }
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Delete from database
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 