import { Chat } from "@/entities/Lesson";
import { Message } from "@/entities/Message";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { CustomJwtPayload } from "@/lib/auth";

interface BatchMessageRequest {
  messages: Array<{
    content: string;
    role: string;
    createdAt: Date;
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string; chatId: string }> }
) {
  let dataSource = null;

  try {
    const { messages } = await request.json() as BatchMessageRequest;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid or empty messages array" }, { status: 400 });
    }

    const cookiesList = await cookies();
    const token = cookiesList.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { lessonId, chatId } = await params;

    dataSource = await initializeDatabase();

    // Verify chat ownership
    const chatRepository = dataSource.getRepository(Chat);
    const chat = await chatRepository.findOne({
      where: {
        id: parseInt(chatId),
        lesson: {
          id: parseInt(lessonId)
        }
      },
      relations: ['lesson', 'lesson.course']
    });

    if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

    for (let i = 0; i < messages.length; i++) {
      const messageRepository = dataSource.getRepository(Message);

      const { role, content, createdAt } = messages[i];

      if (role !== 'user' && role !== 'assistant') {
        console.log('Invalid message role:', messages[i].role);
        continue;
      }

      const message = messageRepository.create({
        content: content,
        role: role as 'user' | 'assistant',
        chatId: parseInt(chatId),
        createdAt
      });
      await messageRepository.save(message);
    }

    // Update chat timestamp
    chat.updatedAt = new Date();
    await chatRepository.save(chat);

    return NextResponse.json({
      success: true,
      messagesCount: messages.length
    });
  } catch (error) {
    console.error('Error saving messages:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 