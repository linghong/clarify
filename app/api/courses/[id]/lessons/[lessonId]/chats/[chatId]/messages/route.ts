import { Chat } from "@/entities/Lesson";
import { Message } from "@/entities/Message";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { CustomJwtPayload } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  let dataSource = null;

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

    dataSource = await initializeDatabase();

    // Verify chat ownership
    const chatRepository = dataSource.getRepository(Chat);
    const { chatId } = await params;
    const lessonId = payload.lessonId;
    const chat = await chatRepository.findOne({
      where: {
        id: parseInt(chatId),
        lesson: {
          id: lessonId
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string; chatId: string }> }
) {
  try {
    const { chatId } = await params;
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
    const messageRepository = dataSource.getRepository(Message);
    const messages = await messageRepository.find({
      where: {
        chatId: chatIdInt
      },
      order: { createdAt: 'ASC' }
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 