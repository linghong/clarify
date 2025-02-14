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
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import { LOCAL_SERVER_URL } from "@/lib/config";

interface MediaUploaderProps {
  pdfUrl: string | null;
  handlePdfChange: (url: string, fileName: string, courseId?: string, lessonId?: string) => void;
  handleVideoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  showVideo: boolean;
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  pdfUrl,
  handlePdfChange,
  handleVideoUpload,
  showVideo
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [tempPdfUrl, setTempPdfUrl] = useState<string>("");
  const [tempFileName, setTempFileName] = useState<string>("");
  const [tempFile, setTempFile] = useState<File | null>(null);
  const [localServerAvailable, setLocalServerAvailable] = useState(true);

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
  }, [selectedCourseId]);

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${LOCAL_SERVER_URL}/healthcheck`);
        setLocalServerAvailable(response.ok);
      } catch (error) {
        setLocalServerAvailable(false);
      }
    };

    checkServer();
  }, [LOCAL_SERVER_URL]);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
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
      console.error('Error fetching lessons:', error);
    }
  };

  const checkLocalServer = async () => {
    try {
      const response = await fetch(`${LOCAL_SERVER_URL}/healthcheck`);
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  const handlePdfSelected = async (file: File) => {
    try {
      const serverAvailable = await checkLocalServer();
      setLocalServerAvailable(serverAvailable);

      if (serverAvailable) {
        const permUrl = `${LOCAL_SERVER_URL}/uploads/${file.name}`;
        setTempPdfUrl(permUrl);
      } else {
        const tempPdfUrl = URL.createObjectURL(file);
        setTempPdfUrl(tempPdfUrl);
        alert('Local server not available, your file will be saved temporarily');
      }

      setIsDialogOpen(true);
      setTempFileName(file.name || '');
      setTempFile(file || null);

    } catch (error) {
      console.error('PDF upload failed:', error);
      alert('Failed to upload PDF');
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
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: fileName,
          type: 'pdf',
          locations: [{
            type: 'local',
            path: url,
            lastSynced: new Date()
          }],
          size: 0, // You might want to get the actual file size
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save PDF resource');
      }

      const data = await response.json();
      handlePdfChange(url, fileName, selectedCourseId, selectedLessonId);
      resetForm();
    } catch (error) {
      console.error('Error saving PDF resource:', error);
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
      if (!localServerResponse.ok) {
        throw new Error('Failed to save file to local server');
      }
    } catch (error) {
      console.error('Error saving PDF resource:', error);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedCourseId || !selectedLessonId || !tempFile) return;
    if (localServerAvailable) {
      await sendFileToLocalServer(tempFile);
    }
    await sendPdfInfoToDatabase(tempPdfUrl, tempFileName);

    handlePdfChange(tempPdfUrl, tempFileName, selectedCourseId, selectedLessonId);
    resetForm();
    setIsDialogOpen(false);

    // Clear PDF URL parameter from the dashboard
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('pdfName');
    window.history.replaceState({}, '', newUrl.toString());
  };

  const resetForm = () => {
    setTempPdfUrl("");
    setTempFileName("");
    setSelectedCourseId("");
    setSelectedLessonId("");
    setTempFile(null);
  };

  return (
    <>
      <div className={`flex gap-2 ${!(pdfUrl || showVideo) && 'order-first'}`}>
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
              <p>Upload PDF</p>
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
                    onChange={handleVideoUpload}
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
              <p>Upload Video (max 100MB)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associate File with Lesson and Save</DialogTitle>
          </DialogHeader>

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
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
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
