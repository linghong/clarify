import { Dispatch, SetStateAction } from 'react';
import { ChatMessage } from '@/types/chat';

interface CreateChatOptions {
  selectedCourseId: string;
  selectedLessonId: string;
  currentPdfId: string;
  currentVideoId: string;
  setActiveChatId: Dispatch<SetStateAction<string>>;
  setActiveChatTitle: Dispatch<SetStateAction<string>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
}

export const createChatUtil = async ({
  selectedCourseId,
  selectedLessonId,
  currentPdfId,
  currentVideoId,
  setActiveChatId,
  setActiveChatTitle,
  setMessages,
  setError
}: CreateChatOptions): Promise<{ chat?: { id: string } } | undefined> => {

  if (!selectedCourseId || !selectedLessonId) {
    setError('Course or lesson not selected, message cannot be saved');
    return;
  }

  const resourceType = currentVideoId ? 'video' :
    currentPdfId ? 'pdf' : 'lesson';

  try {
    const resourceId = currentPdfId ? parseInt(currentPdfId) :
      currentVideoId ? parseInt(currentVideoId) :
        parseInt(selectedLessonId);

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
      throw new Error(errorData.error || 'Failed to save chat');
    }

    const data = await response.json();

    if (data?.chat?.id) {
      setActiveChatId(data.chat.id);
      setActiveChatTitle(chatTitle);
      setMessages([]);
    }

    return data;
  } catch (error) {
    setError('Error saving chat: ' + error);
  }
}; 