import { Dispatch, SetStateAction } from 'react';
import { ChatMessage } from '@/types/chat';
import { Chat } from "@/entities/Lesson";

interface CreateChatOptions {
  selectedCourseId: string;
  selectedLessonId: string;
  currentPdfId: string;
  currentVideoId: string;
  setActiveChatId: Dispatch<SetStateAction<string>>;
  setActiveChatTitle: Dispatch<SetStateAction<string>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setMessageStart: Dispatch<SetStateAction<number>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export interface ChatResponse {
  chat?: Chat;
  error?: string;
}

export const createChatUtil = async ({
  selectedCourseId,
  selectedLessonId,
  currentPdfId,
  currentVideoId,
  setActiveChatId,
  setActiveChatTitle,
  setMessages,
  setError,
  setMessageStart
}: CreateChatOptions): Promise<ChatResponse> => {

  if (!selectedCourseId || !selectedLessonId) {
    setError('Course or lesson not selected, message cannot be saved');
    return { error: 'Course or lesson not selected, message cannot be saved' };
  }

  let resourceType = '';
  let resourceId = '';

  if (currentPdfId) {
    resourceType = 'pdf';
    resourceId = currentPdfId;
  } else if (currentVideoId) {
    resourceType = 'video';
    resourceId = currentVideoId;
  }

  try {
    const chatTitle = `${resourceType} ${resourceId}-${new Date().toLocaleString()}`;

    const response = await fetch(
      `/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          lessonId: selectedLessonId,
          title: chatTitle,
          resourceType,
          resourceId
        }),
        credentials: 'include'
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      setError(errorData.error || 'Failed to save chat');
      return { error: errorData.error || 'Failed to save chat' };
    }

    const data = await response.json();

    if (data?.chat?.id) {
      setActiveChatId(data.chat.id);
      setActiveChatTitle(chatTitle);
      setMessages([]);
      setMessageStart(0);
    }

    return { chat: data.chat };
  } catch (error) {
    console.error('Error saving chat:', error);
    setError('Error saving chat: ' + error);
    return { error: 'Error saving chat: ' + error };
  }
}; 