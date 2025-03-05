import { Dispatch, SetStateAction } from 'react';
import { ChatMessage, ChatResponse } from '@/types/chat';


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

export const createChatUtil = async (options: CreateChatOptions): Promise<ChatResponse> => {

  if (!options.selectedCourseId || !options.selectedLessonId) {
    return { error: 'Course/lesson not selected' };
  }

  const resourceType = options.currentVideoId ? 'video' :
    options.currentPdfId ? 'pdf' : 'lesson';

  try {
    const resourceId = options.currentPdfId ? parseInt(options.currentPdfId) :
      options.currentVideoId ? parseInt(options.currentVideoId) :
        parseInt(options.selectedLessonId);

    const chatTitle = `${resourceType} ${resourceId}-${new Date().toLocaleString()}`;

    const response = await fetch(
      `/api/courses/${options.selectedCourseId}/lessons/${options.selectedLessonId}/chats`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: options.selectedCourseId,
          lessonId: options.selectedLessonId,
          title: chatTitle,
          resourceType,
          resourceId
        }),
        credentials: 'include'
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save chat');
    }

    const data = await response.json();

    if (data?.chat?.id) {
      options.setActiveChatId(data.chat.id);
      options.setActiveChatTitle(chatTitle);
      options.setMessages([]);
      options.setMessageStart(0);
    }

    return { chat: data.chat };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create chat'
    };
  }
}; 