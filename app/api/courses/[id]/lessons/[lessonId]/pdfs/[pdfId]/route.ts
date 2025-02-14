import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { PdfResource } from "@/entities/PDFResource";
import type { CustomJwtPayload } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; lessonId: string; pdfId: string }> }
) {
  try {
    // Properly await cookies
    const cookiesList = await cookies();
    const token = cookiesList.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Properly await the params promise first
    const resolvedParams = await params;
    const { id, lessonId, pdfId } = resolvedParams;

    await initializeDatabase();
    const pdfRepository = AppDataSource.getRepository(PdfResource);

    // Find and validate PDF
    const pdf = await pdfRepository.findOne({
      where: {
        id: parseInt(pdfId),
        lessonId: parseInt(lessonId),
        courseId: parseInt(id)
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