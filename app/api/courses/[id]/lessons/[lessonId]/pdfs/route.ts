import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { PdfResource } from "@/entities/PDFResource";
import { CustomJwtPayload } from "@/lib/auth";
import { LOCAL_SERVER_URL } from "@/lib/config";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const params = await context.params;
    const courseId = parseInt(params.id);
    const lessonId = parseInt(params.lessonId);

    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { name, type, locations, size } = await request.json();

    await initializeDatabase();
    const courseRepository = AppDataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: { id: courseId, userId: payload.userId }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const lessonRepository = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepository.findOne({
      where: { id: lessonId, courseId: courseId }
    });

    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const pdfResourceRepository = AppDataSource.getRepository(PdfResource);
    const pdfResource = pdfResourceRepository.create({
      courseId,
      lessonId,
      name,
      type,
      locations,
      size
    });

    await pdfResourceRepository.save(pdfResource);

    const isLocalStorage = locations.some(loc => loc.path.startsWith(LOCAL_SERVER_URL));

    if (isLocalStorage) {
      // Verify file exists on local server
      const fileCheck = await fetch(locations[0].path);
      if (!fileCheck.ok) {
        return NextResponse.json(
          { error: "File not found on local storage" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ pdfResource });
  } catch (error) {
    console.error('Error creating PDF resource:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const params = await context.params;
    const courseId = parseInt(params.id);
    const lessonId = parseInt(params.lessonId);

    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await initializeDatabase();
    const pdfResourceRepository = AppDataSource.getRepository(PdfResource);
    const pdfs = await pdfResourceRepository.find({
      where: {
        courseId,
        lessonId
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