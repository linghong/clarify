export const saveMessagesBatchToDB = async (
  messages: Array<{ content: string, role: string }>,
  activeChatId: string,
  selectedCourseId: string,
  selectedLessonId: string
) => {
  if (!activeChatId || !messages.length) {
    console.error('No active chat ID or empty messages array');
    return;
  }

  try {
    const response = await fetch(
      `/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats/${activeChatId}/messages/batch`,
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