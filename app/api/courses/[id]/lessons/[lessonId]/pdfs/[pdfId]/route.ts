import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { PdfResource, Chat } from "@/entities/Lesson";
import { Message } from "@/entities/Message";
import type { CustomJwtPayload } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string; pdfId: string }> }
) {
  try {
    const { lessonId, pdfId } = await params;

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
      const pdfRepository = transactionalEntityManager.getRepository(PdfResource);
      const chatRepository = transactionalEntityManager.getRepository(Chat);
      const messageRepository = transactionalEntityManager.getRepository(Message);

      // Find and validate pdf
      const pdf = await pdfRepository.findOne({
        where: {
          id: parseInt(pdfId),
          lessonId: parseInt(lessonId),
        }
      });

      if (!pdf) {
        throw new Error("PDF not found");
      }

      // Find all chats associated with this PDF
      const chats = await chatRepository.find({
        where: {
          resourceType: 'pdf',
          resourceId: parseInt(pdfId)
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

      // Delete the PDF
      await pdfRepository.remove(pdf);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PDF:', error);

    if (error instanceof Error && error.message === "PDF not found") {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string; pdfId: string }> }
) {
  try {
    const { lessonId, pdfId } = await params;

    // Get user authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get request body with status
    const { status } = await request.json();

    // Validate status value
    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const dataSource = await initializeDatabase();
    const pdfRepository = dataSource.getRepository(PdfResource);

    // Find the PDF resource
    const pdf = await pdfRepository.findOne({
      where: {
        id: parseInt(pdfId),
        lessonId: parseInt(lessonId),
      }
    });

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Update the status and timestamps
    pdf.status = status;

    // Update lastAccessedAt if not already set and status is not "not_started"
    if (status !== 'not_started' && !pdf.lastAccessedAt) {
      pdf.lastAccessedAt = new Date();
    }

    // Save the updated PDF
    await pdfRepository.save(pdf);

    return NextResponse.json({ success: true, pdf });
  } catch (error) {
    console.error('Error updating PDF status:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 