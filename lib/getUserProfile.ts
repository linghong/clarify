import { initializeDatabase } from '@/lib/db';
import { User, EducationLevel } from '@/entities/User';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';

export interface UserProfile {
  educationLevel: EducationLevel;
  major?: string;
  description?: string;
}

export async function getUserProfile(token?: string): Promise<UserProfile> {
  if (!token) {
    // redirect to login page
    redirect('/login');
  }

  try {
    const dataSource = await initializeDatabase();
    // Verify the JWT token and get the user ID
    const payload = await verifyToken(token);
    if (!payload || typeof payload === 'string' || !('userId' in payload)) {
      return {
        educationLevel: EducationLevel.OTHER,
        major: undefined,
        description: undefined
      };
    }

    // Get the user repository
    const userRepository = dataSource.getRepository(User);

    // Fetch user profile from database
    const user = await userRepository.findOne({
      where: { id: payload.userId },
      select: ['educationLevel', 'major', 'description']
    });

    if (!user) {
      redirect('/login');
    }

    // Return the profile data
    return {
      educationLevel: user.educationLevel || EducationLevel.OTHER,
      major: user.major,
      description: user.description
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      educationLevel: EducationLevel.OTHER,
      major: undefined,
      description: undefined
    };
  }
}