import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { PdfResource } from "@/entities/PDFResource";
import type { CustomJwtPayload } from "@/lib/auth";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; lessonId: string; pdfId: string } }
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

    // Access params after awaiting
    const { id, lessonId, pdfId } = params;

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

    // Delete file from local server
    const fileName = pdf.locations[0].path.split('/').pop();
    const localDeleteResponse = await fetch('http://127.0.0.1:8000/uploads/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: fileName })
    });

    if (!localDeleteResponse.ok) {
      const error = await localDeleteResponse.json();
      throw new Error(error.error || 'Failed to delete file from storage');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 