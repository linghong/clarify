import { NextResponse } from 'next/server';
import { AppDataSource } from '@/lib/db';
import { User } from '@/entities/User';
import { verifyToken } from '@/lib/auth';

interface JWTPayload {
  userId: string;
}

export async function PUT(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token) as JWTPayload;
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: parseInt(payload.userId) } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    user.educationLevel = body.educationLevel;
    user.major = body.major;
    user.description = body.description;

    await userRepository.save(user);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        educationLevel: user.educationLevel,
        major: user.major,
        description: user.description
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}