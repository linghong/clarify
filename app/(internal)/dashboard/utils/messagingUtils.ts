import { ChatMessage } from "@/types/chat";
import { takeScreenshot } from "@/tools/frontend/screenshoot";
import { captureVideoFrame } from "@/tools/frontend/captureVideoFrame";
import { Chat } from "@/entities/Lesson";

// Define a proper return type for createChat
interface ChatResponse {
  chat?: Chat;
  error?: string;
}

interface SendMessageParams {
  messageText: string;
  messages: ChatMessage[];
  pdfContent?: string;
  activeChatId: string;
  selectedCourseId: string;
  selectedLessonId: string;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setIsAIResponding: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveChatId: React.Dispatch<React.SetStateAction<string>>;
  createChat: () => Promise<ChatResponse>;
  videoUrl?: string;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export const handleSendTextMessage = async ({
  messageText,
  messages,
  pdfContent,
  activeChatId,
  selectedCourseId,
  selectedLessonId,
  setMessages,
  setError,
  setIsAIResponding,
  setActiveChatId,
  createChat,
  videoUrl,
  videoRef
}: SendMessageParams) => {
  if (!messageText.trim()) return;
  setIsAIResponding(true);

  try {
    let newId = activeChatId;

    if (!activeChatId || activeChatId === '') {
      const newChat = await createChat();
      const newChatId = newChat?.chat?.id.toString();
      if (!newChatId) {
        setError('Failed to create chat');
        return;
      }
      newId = newChatId;
    }


    setMessages((prev: ChatMessage[]) => [
      ...prev,
      { role: 'user', content: messageText }
    ]);
    await saveMessageToDB(messageText, 'user', newId, selectedCourseId, selectedLessonId);
    setActiveChatId(newId);

    // Get AI response
    const aiResponse = await fetch('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        text: messageText,
        pdfContent,
        messages
      })
    });

    const data = await aiResponse.json();

    switch (data.type) {
      case 'text':
        await saveMessageToDB(data.content, 'assistant', newId, selectedCourseId, selectedLessonId);
        setMessages((prev: ChatMessage[]) => [
          ...prev,
          { role: 'assistant', content: data.content }
        ]);
        break;

      case 'request_screenshot':
        const screenshotData = await takeScreenshotAndSendBackToAI({
          data,
          messageText,
          messages,
          videoUrl,
          videoRef
        });
        await saveMessageToDB(screenshotData.content, 'assistant', newId, selectedCourseId, selectedLessonId);

        if (screenshotData.type === 'text') {
          setMessages((prev: ChatMessage[]) => [
            ...prev,
            { role: 'assistant', content: screenshotData.content }
          ]);
        }
        break;

      case 'error':
        setError(data.message);
        break;
    }
  } catch (error) {
    console.error('Error:', error);
    setError('Failed to save conversation');
    return 'Failed to save conversation';
  } finally {
    setIsAIResponding(false);
  }
};

interface ScreenshotParams {
  data: { question: string };
  messageText: string;
  messages: ChatMessage[];
  videoUrl?: string;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

export const takeScreenshotAndSendBackToAI = async ({
  data,
  messageText,
  messages,
  videoUrl,
  videoRef
}: ScreenshotParams) => {

  if (!videoRef?.current) {
    throw new Error('Video ref not found');
  }

  const screenshot = await (videoUrl && !videoUrl.includes('http') && videoRef?.current
    ? captureVideoFrame(videoRef)  //for video urls that was temporarily genearated using URL.createObjectURL(file);
    : takeScreenshot()); //hosted on local server

  if (!screenshot) {
    throw new Error('Failed to capture screenshot');
  }

  try {
    const screenshotResponse = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: data.question,
        base64ImageSrc: screenshot,
        messages: [...messages, { role: 'user', content: messageText }] // Include the latest message
      })
    });

    if (!screenshotResponse.ok) {
      throw new Error('Failed to send screenshot to AI');
    }

    return await screenshotResponse.json();
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed to process screenshot');
  }
};

/*
  This function saves a message to the database.
  It is used to save user messages and assistant messages.
  @param messageText - The text of the message to save.
  @param role - user or.
  @param activeChatId - The ID of the active chat.
  @param selectedCourseId - The ID of the selected course.
  @param selectedLessonId - The ID of the selected lesson.
*/
export const saveMessageToDB = async (messageText: string, role: string, activeChatId: string, selectedCourseId: string, selectedLessonId: string) => {
  if (!activeChatId) {
    console.error('No active chat ID available');
    return;
  }

  try {
    const userMessageResponse = await fetch(`/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats/${activeChatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: activeChatId,
        content: messageText,
        role
      })
    });

    if (!userMessageResponse.ok) {
      const errorData = await userMessageResponse.json();
      throw new Error(`Failed to save message: ${errorData.error || userMessageResponse.statusText}`);
    }

  } catch (e) {
    console.error('Error saving message:', e);
  }
}
