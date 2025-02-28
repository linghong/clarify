import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { Lesson, PdfResource } from "@/entities/Lesson";
import { CustomJwtPayload } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id, lessonId } = await params;

    const cookiesList = await cookies();
    const token = cookiesList.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();

    // Add strict validation
    if (!body.name?.trim() || !body.url?.trim()) {
      return NextResponse.json(
        { error: "Valid name and URL are required" },
        { status: 400 }
      );
    }

    const dataSource = await initializeDatabase();

    const courseRepository = dataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: { id: parseInt(id), userId: payload.userId }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const lessonRepository = dataSource.getRepository(Lesson);
    const lesson = await lessonRepository.findOne({
      where: { id: parseInt(lessonId), courseId: parseInt(id) }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const pdfRepository = dataSource.getRepository(PdfResource);

    // Check for existing PDF
    const existingPdf = await pdfRepository.findOne({
      where: {
        name: body.name,
        lessonId: parseInt(lessonId)
      }
    });

    if (existingPdf) {
      return NextResponse.json(
        { error: "File with this name already exists in this lesson" },
        { status: 409 }
      );
    }

    // Create new PDF resource
    const newPdf = pdfRepository.create({
      name: body.name,
      url: body.url,
      lessonId: parseInt(lessonId)
    });

    await pdfRepository.save(newPdf);
    return NextResponse.json({ success: true, pdf: newPdf });

  } catch (error) {
    console.error('Error creating PDF:', error);
    return NextResponse.json(
      { error: "Internal server error - " + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { lessonId } = await params;

    const authHeader = request.headers.get("authorization");
    const cookieStore = await cookies();
    const token = authHeader?.split(" ")[1] || cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const dataSource = await initializeDatabase();
    const pdfResourceRepository = dataSource.getRepository(PdfResource);
    const pdfs = await pdfResourceRepository.find({
      where: {
        lessonId: parseInt(lessonId)
      }
    });

    return NextResponse.json({ pdfs });
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}