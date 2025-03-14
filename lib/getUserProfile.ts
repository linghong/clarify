import { initializeDatabase } from '@/lib/db';
import { User } from '@/entities/User';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';

export interface UserProfileText {
  userProfileText: string;
}

export async function getUserProfile(token: string): Promise<UserProfileText> {
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
        userProfileText: '',
      };
    }

    // Get the user repository
    const userRepository = dataSource.getRepository(User);

    // Fetch user profile from database
    const user = await userRepository.findOne({
      where: { id: payload.userId },
      select: ['educationLevel', 'major', 'description', 'age', 'gender', 'jobTitle', 'yearsOfExperience']
    });

    if (!user) {
      redirect('/login');
    }

    let profileParts = '';
    if (user.educationLevel && user.major) {
      profileParts += `The user has ${user.educationLevel.toLowerCase()} level education, ${user.major ? `majoring in ${user.major.toLowerCase()}. ` : ''}`;
    }

    if (user.age || user.gender) {
      profileParts += `The user is ${user.age ? `${user.age} years old, ` : ''}${user.gender ? user.gender.toLowerCase() : ''}. `;
    }

    if (user.jobTitle || user.yearsOfExperience) {
      profileParts += `The user ${user.jobTitle ? `is a ${user.jobTitle.toLowerCase()}, ` : ''} ${user.yearsOfExperience ? `has ${user.yearsOfExperience} years of experience. ` : ''}`;
    }

    if (user.description) {
      profileParts += `More information about the user: ${user.description}`;
    }

    const userProfileText = profileParts.length > 0 ? `Basic information about the current user: ${profileParts}` : '';

    // Return the profile data
    return { userProfileText };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      userProfileText: ''
    };
  }
}