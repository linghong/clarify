/**
 * Updates the resource status in the database
 * @param type The type of resource (pdf, video, lesson)
 * @param id The resource ID
 * @param status The new status (not_started, in_progress, completed)
 * @param lessonId Optional lesson ID for PDF and video resources
 */
export async function updateResourceStatusInDB(
  type: 'pdf' | 'video' | 'lesson',
  id: number,
  status: 'not_started' | 'in_progress' | 'completed',
  lessonId?: number
): Promise<void> {
  try {
    // Skip update if id is invalid
    if (!id) {
      console.log(`Skipping update for ${type} with invalid id: ${id}`);
      return;
    }

    console.log(`Updating ${type} ${id} status to ${status}`);

    // Include lessonId in the request body if provided
    const requestBody: { status: string; lessonId?: number } = { status };
    if (lessonId && type !== 'lesson') {
      requestBody.lessonId = lessonId;
    }

    const response = await fetch(`/api/resources/${type}/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Status update failed:', errorData);
      throw new Error(`Failed to update resource status: ${response.status}`);
    }

    console.log(`Successfully updated ${type} ${id} status to ${status}`);
  } catch (error) {
    console.error('Error updating resource status:', error);
  }
} 