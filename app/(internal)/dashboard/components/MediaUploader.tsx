import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { useRouter } from "next/navigation";

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
  setActiveChatId: (sessionId: string) => void;
  resetChat: () => void;
  setSelectedCourseName: (name: string) => void;
  setSelectedLessonName: (name: string) => void;
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
  resetChat,
  setSelectedCourseName,
  setSelectedLessonName
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

  const router = useRouter();

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
  }, [selectedCourseId, setSelectedLessonId]);


  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch courses');

      const data = await response.json();
      if (!data.courses) {
        setErrorMessage("No Course Found, please create a course first")
        return;
      }
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
      if (!data.lessons) {
        setErrorMessage("No Lessons Found, please create a lesson first")
        return;
      }
      setLessons(data.lessons || []);

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
      setIsDialogOpen(true);

      setTempVideoFile(null);
      setTempVideoUrl("");

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

      setIsVideoUpload(true);
      setIsDialogOpen(true);

      setTempVideoFile(file);

      setTempFile(null);
      setTempPdfUrl("");
      setTempFileName(file.name || '');

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      alert('Failed to upload video');
    }
  };

  // Send metadata to database - video or pdf
  const sendMetaDataToDatabase = async (url: string, fileName: string, type: 'video' | 'pdf') => {
    if (!selectedCourseId || !selectedLessonId) {
      setIsDialogOpen(false);
      return;
    }
    try {
      const response = await fetch(`/api/courses/${selectedCourseId}/lessons/${selectedLessonId}/${type}s`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        const errorMessage = responseData.error || `Failed to save ${type}`;
        setErrorMessage(errorMessage);
        throw new Error(errorMessage);
      }

      if (responseData?.video) {
        setCurrentVideoId(responseData?.video?.id)
        setErrorMessage('');
        handleVideoChange(url, fileName, selectedCourseId, selectedLessonId);

      } else if (responseData?.pdf) {
        setCurrentPdfId(responseData?.pdf?.id);
        setErrorMessage('');
        handlePdfChange(url, fileName, selectedCourseId, selectedLessonId);

      } else {
        console.log('No video or pdf id returned');
      }

      resetChat();

      return responseData;

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
          await sendMetaDataToDatabase(tempVideoUrl, tempFileName, 'video');

          // Clear URL parameters and navigate to clean dashboard
          router.push('/dashboard');
        }
      } else if (tempFile) {
        if (localServerAvailable) {
          await sendFileToLocalServer(tempFile);
          await sendMetaDataToDatabase(tempPdfUrl, tempFileName, 'pdf');

          // Clear URL parameters and navigate to clean dashboard
          router.push('/dashboard');
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

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);

    // Find course name and update parent state
    const selectedCourse = courses.find(course => course.id.toString() === courseId);
    if (selectedCourse) {
      setSelectedCourseName(selectedCourse.name);
    }

  };

  const handleLessonChange = (lessonId: string) => {
    setSelectedLessonId(lessonId);

    // Find lesson name and update parent state
    const selectedLesson = lessons.find(lesson => lesson.id.toString() === lessonId);
    if (selectedLesson) {
      setSelectedLessonName(selectedLesson.title);
    }
  };

  const [showNoCourseModal, setShowNoCourseModal] = useState(false);
  const [showSelectCourseModal, setShowSelectCourseModal] = useState(false);

  const handleCreateQuickCourse = async (fileName: string) => {
    try {
      // Create a course based on the file name
      const courseName = fileName.split('.')[0]; // Use filename without extension

      const courseResponse = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${courseName} Course`,
          description: `Auto-created course for ${fileName}`
        }),
        credentials: 'include'
      });

      if (!courseResponse.ok) {
        throw new Error('Failed to create course');
      }

      const courseData = await courseResponse.json();

      // Create a default lesson
      const lessonResponse = await fetch(`/api/courses/${courseData.course.id}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: `${courseName} Lesson`,
          description: 'Auto-generated lesson',
          order: 1
        }),
        credentials: 'include'
      });

      if (!lessonResponse.ok) {
        throw new Error('Failed to create lesson');
      }

      const lessonData = await lessonResponse.json();

      // Set the selected course and lesson
      setSelectedCourseId(courseData.course.id.toString());
      setSelectedLessonId(lessonData.lesson.id.toString());
      setSelectedCourseName(courseData.course.name);
      setSelectedLessonName(lessonData.lesson.title);

      // Now proceed with upload
      // Call existing upload function

    } catch (error) {
      console.error('Error creating quick course:', error);
      setErrorMessage('Failed to create course. Please try again.');
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
            <DialogDescription>
              Select a course and lesson to associate this {isVideoUpload ? 'video' : 'PDF'} with.
            </DialogDescription>
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
                onValueChange={handleCourseChange}
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
                onValueChange={handleLessonChange}
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

      <Dialog open={showNoCourseModal} onOpenChange={setShowNoCourseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You need a course to upload content</DialogTitle>
            <DialogDescription>
              Before uploading, you need to create a course to organize your content
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button onClick={() => {
              setShowNoCourseModal(false);
              router.push('/courses?createNew=true');
            }}>
              Create a new course
            </Button>
            <Button variant="outline" onClick={() => {
              setShowNoCourseModal(false);
              // Create a quick course with the filename
              handleCreateQuickCourse(tempFileName);
            }}>
              Create quick course for this file
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSelectCourseModal} onOpenChange={setShowSelectCourseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a course</DialogTitle>
            <DialogDescription>
              Please select a course and lesson before uploading your content
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {/* Course selection component here */}
          </div>
          <Button onClick={() => setShowSelectCourseModal(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MediaUploader;
