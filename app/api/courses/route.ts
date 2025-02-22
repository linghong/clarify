import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { initializeDatabase } from "@/lib/db";
import { Course, CourseStatus } from "@/entities";
import { verifyToken } from "@/lib/auth";
import { CustomJwtPayload } from "@/lib/auth";

export async function GET() {
  try {
    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const dataSource = await initializeDatabase();
    const courseRepository = dataSource.getRepository(Course);

    const courses = await courseRepository.find({
      where: { userId: payload.userId },
      relations: ["lessons"],
      order: {
        createdAt: "DESC"
      }
    });

    const updatedCourses = await Promise.all(courses.map(async (course) => {
      const lessonsCount = course.lessons.length;
      if (course.lessonsCount !== lessonsCount) {
        course.lessonsCount = lessonsCount;
        return await courseRepository.save(course);
      }
      return course;
    }));

    return NextResponse.json({ courses: updatedCourses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: "Failed to fetch courses: " + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookiesList = await cookies();
    const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Course name is required" },
        { status: 400 }
      );
    }

    const dataSource = await initializeDatabase();
    const courseRepository = dataSource.getRepository(Course);

    const course = courseRepository.create({
      name,
      description,
      userId: payload.userId,
      status: CourseStatus.DRAFT,
      lessonsCount: 0
    });

    await courseRepository.save(course);

    return NextResponse.json({ course });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}