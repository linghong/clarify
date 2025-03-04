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