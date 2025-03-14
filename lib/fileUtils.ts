/**
 * Utility functions for file operations
 */
import { LOCAL_SERVER_URL } from "@/lib/config";
import { FILE_STATUS } from "@/lib/constants";
/**
 * Deletes a file from the local ai server
 * @param fileUrl The URL or path of the file to delete
 * @param isDirectory Optional flag to indicate if the path is a directory
 * @returns Promise with the result of the operation
 */
export async function deleteFileFromLocalServer(fileUrl: string, isDirectory = false) {
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
        filepath: filePath,
        is_directory: isDirectory
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || `Server returned status ${response.status}`
      };
    }

    const result = await response.json();
    return { success: true, info: result.info };
  } catch (error) {
    console.error(`Error deleting file ${fileUrl.split('uploads/')[1]}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during file deletion'
    };
  }
}

/**
 * Deletes multiple files from the local ai server
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

/**
 * Delete a course directory and all its contents from the local server
 * @param courseId The ID of the course to delete
 * @returns Promise with the result of the operation
 */
export async function deleteCourseDirectoryFromLocalServer(
  courseId: string | number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a filepath that points to the course directory
    const filepath = `course_${courseId}`;

    const response = await fetch(`${LOCAL_SERVER_URL}/uploads/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filepath: filepath,
        delete_course_dir: true
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from local server:', errorData);
      return {
        success: false,
        error: errorData.error || `Server returned status ${response.status}`
      };
    }
    return { success: true };

  } catch (error) {
    console.error('Error deleting course directory:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during directory deletion'
    };
  }
}

