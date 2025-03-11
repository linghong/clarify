import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { initializeDatabase } from '@/lib/db';
import { Note } from '@/entities/Note';
import type { CustomJwtPayload } from '@/lib/auth';

// Helper to extract and validate ID
const getValidatedId = (params: { id: string }) => {
  const noteId = parseInt(params.id);
  if (isNaN(noteId)) {
    throw new Error('Invalid note ID');
  }
  return noteId;
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Fix: Properly handle params
    let noteId;
    try {
      noteId = getValidatedId(await params);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid note ID: ' + error }, { status: 400 });
    }

    const dataSource = await initializeDatabase();
    const noteRepository = dataSource.getRepository(Note);

    const note = await noteRepository.findOne({
      where: {
        id: noteId,
        userId: payload.userId
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Fix: Properly handle params
    let noteId;
    try {
      noteId = getValidatedId(await params);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid note ID' + error }, { status: 400 });
    }

    const { title, content } = await request.json();

    if (!content.trim()) {
      return NextResponse.json({ error: 'Note content cannot be empty' }, { status: 400 });
    }

    const dataSource = await initializeDatabase();
    const noteRepository = dataSource.getRepository(Note);

    const note = await noteRepository.findOne({
      where: {
        id: noteId,
        userId: payload.userId
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (title) note.title = title;
    note.content = content;

    await noteRepository.save(note);

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json({ error: 'Internal server error' + error }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Fix: Properly handle params
    let noteId;
    try {
      noteId = getValidatedId(await params);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid note ID' + error }, { status: 400 });
    }

    const dataSource = await initializeDatabase();
    const noteRepository = dataSource.getRepository(Note);

    const note = await noteRepository.findOne({
      where: {
        id: noteId,
        userId: payload.userId
      }
    });

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    await noteRepository.remove(note);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 