import { NextResponse, NextRequest } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { PdfResource } from "@/entities/PDFResource";
import type { CustomJwtPayload } from "@/lib/auth";

type Params = Promise<{ id: string; lessonId: string; pdfId: string }>;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { id: courseId, lessonId, pdfId } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await initializeDatabase();
    const pdfRepository = AppDataSource.getRepository(PdfResource);

    // Find and validate pdf
    const pdf = await pdfRepository.findOne({
      where: {
        id: parseInt(pdfId),
        lessonId: parseInt(lessonId),
        courseId: parseInt(courseId)
      }
    });

    if (!pdf) {
      return NextResponse.json({ error: "PDF not found" }, { status: 404 });
    }

    // Delete from database
    await pdfRepository.remove(pdf);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 