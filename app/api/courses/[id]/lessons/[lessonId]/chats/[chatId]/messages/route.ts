import { Message } from "@/entities/Message";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { CustomJwtPayload } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { chatId: string } }
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
    const messageRepository = dataSource.getRepository(Message);

    const message = messageRepository.create({
      content,
      role,
      chatId: parseInt(params.chatId)
    });

    await messageRepository.save(message);
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 