import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { AppDataSource, initializeDatabase } from "@/lib/db";
import { Course } from "@/entities/Course";
import { CustomJwtPayload } from "@/lib/auth";

// GET /api/courses/[id] - Get a specific course
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const courseId = parseInt(id);

    if (isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

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
    const courseRepository = AppDataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: {
        id: courseId,
        userId: payload.userId
      },
      relations: ["lessons"]
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/courses/[id] - Update a course
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const courseId = parseInt(id);

    if (isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { name, description } = await request.json();

    await initializeDatabase();
    const courseRepository = AppDataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: {
        id: courseId,
        userId: payload.userId
      }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    course.name = name;
    course.description = description;
    await courseRepository.save(course);

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id] - Delete a course
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const courseId = parseInt(id);

    if (isNaN(courseId)) {
      return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
    }

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
    const courseRepository = AppDataSource.getRepository(Course);
    const course = await courseRepository.findOne({
      where: {
        id: courseId,
        userId: payload.userId
      }
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    await courseRepository.remove(course);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}