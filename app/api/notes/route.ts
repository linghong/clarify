import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { initializeDatabase } from '@/lib/db';
import { Note } from '@/entities/Note';
import type { CustomJwtPayload } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { content, resourceType, resourceId, lessonId, courseId } = await request.json();

    // Validate required fields
    if (!content || !resourceType || !resourceId || !lessonId || !courseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dataSource = await initializeDatabase();
    const noteRepository = dataSource.getRepository(Note);

    // Create new note
    const note = new Note();
    note.content = content;
    note.resourceType = resourceType;
    note.resourceId = resourceId;
    note.lessonId = lessonId;
    note.courseId = courseId;
    note.userId = payload.userId;

    await noteRepository.save(note);

    return NextResponse.json({ success: true, note }, { status: 201 });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token) as CustomJwtPayload;
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const resourceType = url.searchParams.get('resourceType');
    const resourceId = url.searchParams.get('resourceId');
    const lessonId = url.searchParams.get('lessonId');
    const courseId = url.searchParams.get('courseId');

    const dataSource = await initializeDatabase();
    const noteRepository = dataSource.getRepository(Note);

    let query = noteRepository
      .createQueryBuilder('note')
      .where('note.userId = :userId', { userId: payload.userId })
      .orderBy('note.updatedAt', 'DESC');

    if (resourceType && resourceId) {
      query = query
        .andWhere('note.resourceType = :resourceType', { resourceType })
        .andWhere('note.resourceId = :resourceId', { resourceId });
    } else if (lessonId) {
      query = query.andWhere('note.lessonId = :lessonId', { lessonId });
    } else if (courseId) {
      query = query.andWhere('note.courseId = :courseId', { courseId });
    }

    const notes = await query.getMany();

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 