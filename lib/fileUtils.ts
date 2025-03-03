/**
 * Utility functions for file operations
 */
import { LOCAL_SERVER_URL } from "@/lib/config";

/**
 * Deletes a file from the local-ai-server
 * @param url The URL of the file to delete
 * @returns A promise that resolves when the file is deleted or fails gracefully
 */
export async function deleteFileFromLocalServer(url: string): Promise<void> {
  if (!url) return;

  const fileName = url.split('/').pop();
  console.log('fileName', fileName)
  if (!fileName) return;

  try {
    const localDeleteResponse = await fetch(`${LOCAL_SERVER_URL}/uploads/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: fileName })
    });

    if (!localDeleteResponse.ok) {
      console.warn(`Failed to delete file: ${fileName}. Server responded with ${localDeleteResponse.status}`);
      const error = await localDeleteResponse.json();
      throw new Error(error.error || 'Failed to delete file from storage')
    }
  } catch (error) {
    console.warn(`Failed to delete file: ${fileName}`, error);
    throw error; // Re-throw so caller can handle if needed
  }
}

/**
 * Deletes multiple files from the local-ai-server
 * @param urls Array of file URLs to delete
 * @returns A promise that resolves when all files are processed
 */
export async function deleteFilesFromLocalServer(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0) return;

  const results = await Promise.allSettled(urls.map(url => deleteFileFromLocalServer(url)));

  // Check if any deletions failed
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    throw new Error(`Failed to delete ${failures.length} files`);
  }
}

