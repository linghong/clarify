"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import PdfUploader from "@/components/PdfUploader";
import PdfViewer from "@/components/PdfViewer";
import { Upload } from "lucide-react";

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileUploaded: (data: {
    url: string;
    fileName: string;
    courseId: string;
    lessonId: string;
  }) => void;
}

export default function UploadFileDialog({
  open,
  onOpenChange,
  onFileUploaded
}: UploadFileDialogProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCourses();
    }
  }, [open]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchLessons(selectedCourseId);
    } else {
      setLessons([]);
      setSelectedLessonId("");
    }
  }, [selectedCourseId]);

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

  const handlePdfChange = (url: string, name: string) => {
    setPdfUrl(url);
    setFileName(name);
  };

  const handleSubmit = () => {
    if (!selectedCourseId || !selectedLessonId || !pdfUrl || !fileName) {
      return;
    }

    onFileUploaded({
      url: pdfUrl,
      fileName,
      courseId: selectedCourseId,
      lessonId: selectedLessonId
    });

    // Reset form
    setPdfUrl("");
    setFileName("");
    setSelectedCourseId("");
    setSelectedLessonId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload PDF File</DialogTitle>
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

          <div className="space-y-2">
            <Label>PDF File</Label>
            <div className="flex items-center gap-4">
              <PdfUploader
                onPdfChange={handlePdfChange}
                hasActivePdf={!!pdfUrl}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Upload className="h-4 w-4" />
              </PdfUploader>
              {fileName && <span className="text-sm text-muted-foreground">{fileName}</span>}
            </div>
          </div>

          {pdfUrl && (
            <div className="h-[300px] border rounded-md">
              <PdfViewer pdfUrl={pdfUrl} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCourseId || !selectedLessonId || !pdfUrl}
          >
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}