import { TextChatAgent } from '@/agents/TextChatAgent';
import { NextRequest, NextResponse } from 'next/server';

// to TextChatAgent
export async function POST(req: NextRequest) {
  try {
    const agent = new TextChatAgent();
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