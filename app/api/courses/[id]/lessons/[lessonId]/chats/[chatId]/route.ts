import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { Chat } from "@/entities/Chat";
import { Message } from "@/entities/Message";
import { CustomJwtPayload } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string; chatId: string }> }
) {
  try {
    const { id, lessonId, chatId } = await params;
    const chatIdInt = parseInt(chatId);

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
    const messageRepository = dataSource.getRepository(Message);

    const chat = await chatRepository.findOne({
      where: {
        id: chatIdInt,
        lesson: {
          id: parseInt(lessonId),
          course: {
            id: parseInt(id),
            userId: payload.userId
          }
        }
      },
      relations: ['lesson', 'lesson.course']
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    await messageRepository.delete({ chatId: chatIdInt });

    await chatRepository.remove(chat);

    return NextResponse.json({ message: "Chat deleted successfully" });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 