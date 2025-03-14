import { TextChatAgent } from '@/agents/TextChatAgent';
import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@/lib/getUserProfile';
import { cookies } from 'next/headers';
// to TextChatAgent
export async function POST(req: NextRequest) {
  const cookiesList = await cookies();
  const token = cookiesList.has("token") ? cookiesList.get("token")?.value : null;
  if (!token) {
    return NextResponse.json(
      { type: 'error', message: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const userProfileData = await getUserProfile(token);
    const agent = new TextChatAgent(userProfileData);
    const data = await req.json();
    const response = await agent.processMessage(data);

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { type: 'error', message: 'Server error' },
      { status: 500 }
    );
  }
}