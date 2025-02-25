import { Chat, Message } from "@/entities";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { CustomJwtPayload } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { content, role } = await request.json();

    const cookiesList = await cookies();
    const token = cookiesList.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const dataSource = await initializeDatabase();

    // Verify chat ownership
    const chatRepository = dataSource.getRepository(Chat);
    const { chatId } = await params;
    const lessonId = payload.lessonId;
    const chat = await chatRepository.findOne({
      where: {
        id: parseInt(chatId),
        lesson: {
          id: lessonId,
          course: {
            userId: payload.userId
          }
        }
      },
      relations: ['lesson', 'lesson.course']
    });

    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

    const messageRepository = dataSource.getRepository(Message);
    const message = messageRepository.create({
      content,
      role,
      chatId: parseInt(chatId)
    });

    await messageRepository.save(message);

    // Update chat's updatedAt timestamp
    chat.updatedAt = new Date();
    await chatRepository.save(chat);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 