/**
 * Utility functions for file operations
 */
import { LOCAL_SERVER_URL } from "@/lib/config";
import { FILE_STATUS } from "@/lib/constants";
/**
 * Deletes a file from the local-ai-server
 * @param fileUrl The URL of the file to delete
 * @returns A promise that resolves when the file is deleted or fails gracefully
 */
export async function deleteFileFromLocalServer(fileUrl: string) {
  try {
    // Handle empty URL or missing fileUrl
    if (!fileUrl) {
      console.warn('No file URL provided for deletion');
      return { success: false, error: 'No file URL provided' };
    }
    if (fileUrl.includes(FILE_STATUS.UNAVAILABLE)) {
      console.warn('File was not saved in the local storage, no need to delete it');
      return { success: false, error: 'File was not saved, no need to delete it' };
    }

    let filePath = fileUrl;
    // If it's a full URL with hostname, extract just the path
    if (fileUrl.includes('http')) {
      const urlParts = fileUrl.split('/uploads/');
      if (urlParts.length > 1) {
        filePath = urlParts[1];
      }
    }

    const response = await fetch(`${LOCAL_SERVER_URL}/uploads/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filepath: filePath
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`Failed to delete file ${filePath} from local storage:`, result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error(`Error deleting file ${fileUrl.split('uploads/')[1]}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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

