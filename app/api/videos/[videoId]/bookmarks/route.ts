import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/db";
import { VideoBookmark } from "@/entities/VideoBookmark";
import { getCurrentUser } from "@/lib/session";

// GET all bookmarks for a video
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const params = await context.params;
    const videoId = params.videoId;

    const dataSource = await initializeDatabase();
    const bookmarkRepository = dataSource.getRepository(VideoBookmark);

    const bookmarks = await bookmarkRepository.find({
      where: {
        videoId: parseInt(videoId),
        userId: user.id
      },
      order: {
        timestamp: "ASC"
      }
    });

    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    );
  }
}

// POST a new bookmark
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ videoId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const params = await context.params;
    const videoId = params.videoId;

    const { timestamp, note, label } = await request.json();

    const dataSource = await initializeDatabase();
    const bookmarkRepository = dataSource.getRepository(VideoBookmark);

    const bookmark = new VideoBookmark();
    bookmark.userId = user.id;
    bookmark.videoId = parseInt(videoId);
    bookmark.timestamp = timestamp;
    bookmark.note = note;
    bookmark.label = label;

    const savedBookmark = await bookmarkRepository.save(bookmark);

    return NextResponse.json({ bookmark: savedBookmark });
  } catch (error) {
    console.error("Error creating bookmark:", error);
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 }
    );
  }
} 