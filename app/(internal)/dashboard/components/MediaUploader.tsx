import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Upload, Video as VideoIcon } from "lucide-react";
import PdfUploader from "@/components/PdfUploader";
import { Course, Lesson } from "@/types/course";
import { LOCAL_SERVER_URL } from "@/lib/config";

interface MediaUploaderProps {
  pdfUrl: string | null;
  handlePdfChange: (url: string, fileName: string, courseId?: string, lessonId?: string) => void;
  handleVideoChange: (url: string, fileName: string, courseId?: string, lessonId?: string) => void;
  videoUrl: string | null;
  selectedCourseId: string;
  selectedLessonId: string;
  setSelectedCourseId: (courseId: string) => void;
  setSelectedLessonId: (lessonId: string) => void;
  setCurrentPdfId: (pdfId: string) => void;
  setCurrentVideoId: (videoId: string) => void;
  setActiveChatSessionId: (sessionId: string) => void;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  pdfUrl,
  handlePdfChange,
  handleVideoChange,
  videoUrl,
  selectedCourseId,
  selectedLessonId,
  setSelectedCourseId,
  setSelectedLessonId,
  setCurrentPdfId,
  setCurrentVideoId,
  setActiveChatSessionId
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [tempPdfUrl, setTempPdfUrl] = useState<string>("");
  const [tempFileName, setTempFileName] = useState<string>("");
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [localServerAvailable, setLocalServerAvailable] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [tempVideoFile, setTempVideoFile] = useState<File | null>(null);
  const [tempVideoUrl, setTempVideoUrl] = useState<string>("");
  const [isVideoUpload, setIsVideoUpload] = useState(false);

  useEffect(() => {
    if (isDialogOpen) {
      fetchCourses();
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchLessons(selectedCourseId);
    } else {
      setLessons([]);
      setSelectedLessonId("");
    }
  }, [selectedCourseId, selectedLessonId]);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data.courses);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const fetchLessons = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/lessons`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch lessons');
      const data = await response.json();
      setLessons(data.lessons);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const checkLocalServer = async () => {
    try {
      const response = await fetch(`${LOCAL_SERVER_URL}/healthcheck`);
      const isAvailable = response.ok;
      setLocalServerAvailable(isAvailable);
      return isAvailable;
    } catch (error) {
      console.error('Error checking local server:', error instanceof Error ? error.message : 'Unknown error');
      setLocalServerAvailable(false);
      return false;
    }
  };

  const handlePdfSelected = async (file: File) => {
    try {
      const serverAvailable = await checkLocalServer();

      if (serverAvailable) {
        const permUrl = `${LOCAL_SERVER_URL}/uploads/${file.name}`;
        setTempPdfUrl(permUrl);
      } else {
        const tempPdfUrl = URL.createObjectURL(file);
        setTempPdfUrl(tempPdfUrl);
        alert('Local server not available, your file will be saved temporarily');
      }

      setIsVideoUpload(false);
      setTempVideoFile(null);
      setTempVideoUrl("");
      setIsDialogOpen(true);
      setTempFileName(file.name || '');
      setTempFile(file || null);

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      alert('Failed to upload PDF');
    }
  };

  const handleVideoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const serverAvailable = await checkLocalServer();

      if (serverAvailable) {
        const permUrl = `${LOCAL_SERVER_URL}/uploads/${file.name}`;
        setTempVideoUrl(permUrl);
      } else {
        const tempVideoUrl = URL.createObjectURL(file);
        setTempVideoUrl(tempVideoUrl);
        alert('Local server not available, your file will be saved temporarily');
      }

      setTempFile(null);
      setTempPdfUrl("");
      setIsVideoUpload(true);
      setIsDialogOpen(true);
      setTempFileName(file.name || '');
      setTempVideoFile(file);

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      alert('Failed to upload video');
    }
  };

  const sendPdfInfoToDatabase = async (url: string, fileName: string) => {
    if (!selectedCourseId || !selectedLessonId) {
      setIsDialogOpen(false);
      return;
    }
    try {
      const response = await fetch(`/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/pdfs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: fileName,
          url: url,
          courseId: parseInt(selectedCourseId),
          lessonId: parseInt(selectedLessonId)
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        setErrorMessage(responseData.error || 'Failed to save PDF');
        throw new Error(responseData.error || 'Failed to save PDF resource');
      }

      if (responseData?.pdf) setCurrentPdfId(responseData?.pdf?.id);
      setErrorMessage('');
      handlePdfChange(url, fileName, selectedCourseId, selectedLessonId);

      const chatRes = await fetch(`/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats`, {
        method: 'POST',
        body: JSON.stringify({
          resourceType: 'pdf',
          resourceId: responseData?.pdf?.id
        })
      });
      const { chat } = await chatRes.json();
      setActiveChatSessionId(chat.id);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      setErrorMessage("File with this name already exists in this lesson");
      throw error;
    }
  };

  const sendVideoInfoToDatabase = async (url: string, fileName: string) => {
    if (!selectedCourseId || !selectedLessonId) {
      setIsDialogOpen(false);
      return;
    }
    try {
      const response = await fetch(`/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: fileName,
          url: url,
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || 'Failed to save video';
        setErrorMessage(errorMessage);
        throw new Error(errorMessage);
      }
      if (responseData?.video) setCurrentVideoId(responseData?.video?.id);
      setErrorMessage('');
      handleVideoChange(url, fileName, selectedCourseId, selectedLessonId);

      const chatRes = await fetch(`/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/chats`, {
        method: 'POST',
        body: JSON.stringify({
          resourceType: 'video',
          resourceId: responseData?.video?.id
        })
      });
      const { chat } = await chatRes.json();
      setActiveChatSessionId(chat.id);
      return responseData.video;
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      // Only set duplicate error message if that's actually the error from server
      if (error instanceof Error && error.message.includes('already exists')) {
        setErrorMessage("File with this name already exists in this lesson");
      } else {
        setErrorMessage("Failed to save video");
      }
      throw error;
    }
  };

  const sendFileToLocalServer = async (file: File) => {
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const localServerResponse = await fetch(`${LOCAL_SERVER_URL}/uploads/`, {
        method: 'POST',
        body: formData,
      });

      const responseText = await localServerResponse.text();

      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error(e);
        responseData = { detail: responseText };
      }

      if (!localServerResponse.ok) {
        throw new Error(responseData.detail || responseData.error || 'Upload failed');
      }

      return responseData;
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to save file to local server';
      setErrorMessage(errorMessage);
      throw error;
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedCourseId || !selectedLessonId) return;

    if ((isVideoUpload && !tempVideoUrl) || (!isVideoUpload && !tempPdfUrl)) {
      setErrorMessage("Missing file URL - please try uploading again");
      return;
    }

    try {
      if (isVideoUpload && tempVideoFile) {
        if (localServerAvailable) {
          await sendFileToLocalServer(tempVideoFile);
          await sendVideoInfoToDatabase(tempVideoUrl, tempFileName);
        }
      } else if (tempFile) {
        if (localServerAvailable) {
          await sendFileToLocalServer(tempFile);
          await sendPdfInfoToDatabase(tempPdfUrl, tempFileName);
        }
      }
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save file';
      console.error('Error:', errorMessage);
      setErrorMessage(errorMessage);
    }
  };

  const resetForm = () => {
    setTempPdfUrl("");
    setTempFileName("");

    setTempFile(null);
    setTempVideoFile(null);
    setTempVideoUrl("");
    setIsVideoUpload(false);
    setErrorMessage("");
    setIsDialogOpen(false);

    if (tempVideoUrl) {
      URL.revokeObjectURL(tempVideoUrl);
    }
  };

  return (
    <>
      <div className={`flex gap-2 ${!(pdfUrl || videoUrl) && 'order-first'}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <PdfUploader
                  onPdfChange={handlePdfSelected}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Upload className="h-4 w-4" />
                </PdfUploader>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload PDF and Save to Lesson</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelected}
                    className="hidden"
                    id="video-upload"
                  />
                  <Button
                    type="button"
                    onClick={() => document.getElementById('video-upload')?.click()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <VideoIcon className="h-4 w-4" />
                  </Button>
                </label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upload Video (max 100MB) and Save to Lesson</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Associate {isVideoUpload ? 'Video' : 'File'} with Course and Lesson, and Save
            </DialogTitle>
          </DialogHeader>

          {errorMessage && (
            <div className="text-red-600 text-sm mb-4">
              ⚠ {errorMessage}
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select
                value={selectedCourseId}
                onValueChange={setSelectedCourseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lesson</Label>
              <Select
                value={selectedLessonId}
                onValueChange={setSelectedLessonId}
                disabled={!selectedCourseId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lesson" />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map((lesson) => (
                    <SelectItem key={lesson.id} value={lesson.id.toString()}>
                      {lesson.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => resetForm()}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={!selectedCourseId || !selectedLessonId}
            >
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaUploader;
