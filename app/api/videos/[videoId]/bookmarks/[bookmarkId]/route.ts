import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { VideoBookmark } from "@/entities/VideoBookmark";
import { getCurrentUser } from "@/lib/session";

// DELETE a specific bookmark
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ videoId: string, bookmarkId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fix: Await the params object
    const params = await context.params;
    const videoId = params.videoId;
    const bookmarkId = params.bookmarkId;

    const dataSource = await initializeDatabase();
    const bookmarkRepository = dataSource.getRepository(VideoBookmark);

    // Find the bookmark and verify it belongs to the current user
    const bookmark = await bookmarkRepository.findOne({
      where: {
        id: parseInt(bookmarkId),
        videoId: parseInt(videoId),
        userId: user.id
      }
    });

    if (!bookmark) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    // Delete the bookmark
    await bookmarkRepository.remove(bookmark);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 }
    );
  }
} 