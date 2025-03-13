export const saveMessagesBatchToDB = async (
  messages: Array<{ content: string, role: string }>,
  activeChatId: string,
  selectedCourseId: string,
  selectedLessonId: string,
  createChat: () => Promise<{ chat?: { id: number }, error?: string }>
) => {
  let newId = activeChatId;
  if (!activeChatId || activeChatId === '') {
    const newChat = await createChat();
    const newChatId = newChat?.chat?.id.toString();
    if (!newChatId) {
      return { error: 'Failed to create chat' };
    }
    newId = newChatId;
  }

  if (!messages.length) {
    console.log('Empty messages array, no message saved to DB');
    return;
  }

  try {
    const response = await fetch(
      `/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats/${newId}/messages/batch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to save messages: ${errorData.error || response.statusText}`);
    }

    return await response.json();
  } catch (e) {
    console.error('Error saving messages batch:', e);
    throw e;
  }
} 