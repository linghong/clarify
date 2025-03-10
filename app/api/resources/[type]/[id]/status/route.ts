import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { initializeDatabase } from '@/lib/db';
import { Lesson, PdfResource, VideoResource } from '@/entities/Lesson';
import type { CustomJwtPayload } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    // Destructure params after ensuring they're resolved
    const { type, id } = await params;

    // Get user authentication
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get request body with status and optional lessonId
    const { status, lessonId } = await request.json();

    // Validate status value
    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    const dataSource = await initializeDatabase();
    const lessonRepository = dataSource.getRepository(Lesson);

    // For lesson type, use the ID directly
    let lesson = null;
    if (type === 'lesson') {
      lesson = await lessonRepository.findOne({ where: { id: parseInt(id) } });

      if (!lesson) {
        return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      }

      lesson.status = status;
      if (status !== 'not_started' && !lesson.lastAccessedAt) {
        lesson.lastAccessedAt = new Date();
      }

      await lessonRepository.save(lesson);
      return NextResponse.json({ success: true, lesson });
    }

    // For PDF and video, look up both the resource and the parent lesson
    if (type === 'pdf') {
      // PDF handling with lessonId
      const pdfRepository = dataSource.getRepository(PdfResource);
      const pdf = await pdfRepository.findOne({ where: { id: parseInt(id) } });

      if (!pdf) {
        return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
      }

      // Update PDF status
      pdf.status = status;
      if (status !== 'not_started' && !pdf.lastAccessedAt) {
        pdf.lastAccessedAt = new Date();
      }
      await pdfRepository.save(pdf);

      // If lessonId is provided, look up and update the parent lesson
      if (lessonId) {
        const parentLesson = await lessonRepository.findOne({
          where: { id: lessonId }
        });

        if (parentLesson && status === 'in_progress' && parentLesson.status === 'not_started') {
          parentLesson.status = 'in_progress';
          parentLesson.lastAccessedAt = new Date();
          await lessonRepository.save(parentLesson);
        }
      }

      return NextResponse.json({ success: true, pdf });
    }

    // Video handling follows the same pattern
    if (type === 'video') {
      const videoRepository = dataSource.getRepository(VideoResource);
      const video = await videoRepository.findOne({ where: { id: parseInt(id) } });

      if (!video) {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }

      video.status = status;
      if (status !== 'not_started' && !video.lastAccessedAt) {
        video.lastAccessedAt = new Date();
      }

      await videoRepository.save(video);

      // If lessonId is provided, look up and update the parent lesson
      if (lessonId) {
        const parentLesson = await lessonRepository.findOne({
          where: { id: lessonId }
        });

        if (parentLesson && status === 'in_progress' && parentLesson.status === 'not_started') {
          parentLesson.status = 'in_progress';
          parentLesson.lastAccessedAt = new Date();
          await lessonRepository.save(parentLesson);
        }
      }

      return NextResponse.json({ success: true, video });
    }

    return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 });

  } catch (error) {
    console.error('Error updating resource status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}