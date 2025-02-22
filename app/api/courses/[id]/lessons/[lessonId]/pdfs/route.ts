import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { PdfResource } from "@/entities";
import { CustomJwtPayload } from "@/lib/auth";
import { LOCAL_SERVER_URL } from "@/lib/config";

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
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();

    const dataSource = await initializeDatabase();
    const pdfRepository = dataSource.getRepository(PdfResource);

    // Check for existing PDF with same name in the same lesson
    const existingPdf = await pdfRepository.findOne({
      where: {
        name: body.name,
        courseId: parseInt(id),
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
      ...body,
      courseId: parseInt(id),
      lessonId: parseInt(lessonId),
      userId: payload.userId
    });

    await pdfRepository.save(newPdf);

    const isLocalStorage = body.locations.some((loc: { path: string }) => loc.path.startsWith(LOCAL_SERVER_URL));

    if (isLocalStorage) {
      // Verify file exists on local server
      const fileCheck = await fetch(body.locations[0].path);
      if (!fileCheck.ok) {
        return NextResponse.json(
          { error: "File not found on local storage" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ success: true, pdf: newPdf });
  } catch (error) {
    console.error('Error creating PDF resource:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { id: courseId, lessonId } = await params;

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
        courseId: parseInt(courseId),
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