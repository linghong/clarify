"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Course, Lesson } from "@/types/course";
import CreateLessonDialog from "@/app/(internal)/courses/components/CreateLessonDialog";
import Breadcrumb from '@/components/BreadCrumb';
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/Toast";
import { deleteFileFromLocalServer } from "@/lib/fileUtils";

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { addToast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isCreateLessonDialogOpen, setIsCreateLessonDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteCourseDialogOpen, setIsDeleteCourseDialogOpen] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  const { loading } = useAuthCheck(router, mounted);

  const fetchCourse = useCallback(async () => {
    try {
      const response = await fetch(`/api/courses/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course');
      }

      const data = await response.json();
      setCourse(data.course);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [id]);

  const fetchLessons = useCallback(async () => {
    try {
      const response = await fetch(`/api/courses/${id}/lessons`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch lessons');
      const data = await response.json();
      setLessons(data.lessons);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted && id) {
      fetchCourse();
      fetchLessons();
    }
  }, [loading, mounted, id, fetchCourse, fetchLessons]);

  const handleViewResources = (lessonId: number) => {
    router.push(`/courses/${id}/lessons/${lessonId}`);
  };

  const handleEditLesson = (lessonId: number) => {
    router.push(`/courses/${id}/lessons/${lessonId}/edit`);
  };

  const openDeleteDialog = (lesson: Lesson) => {
    setLessonToDelete(lesson);
    setIsDeleteDialogOpen(true);
  };

  const deleteLesson = async () => {
    if (!lessonToDelete) return;

    setIsDeleting(true);
    try {
      // Step 1: Delete database records
      const response = await fetch(`/api/courses/${id}/lessons/${lessonToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete lesson');
      }

      // Get the files that need to be deleted
      const data = await response.json();
      const { filesToDelete } = data;

      // Step 2: Remove the deleted lesson from the UI state immediately
      setLessons(lessons.filter(lesson => lesson.id !== lessonToDelete.id));

      // Show success message
      addToast({
        title: "Lesson deleted",
        description: `"${lessonToDelete.title}" and all associated resources have been deleted.`,
      });

      // Step 3: Attempt to delete the files (non-blocking)
      if (filesToDelete && (filesToDelete.pdfs.length > 0 || filesToDelete.videos.length > 0)) {
        try {
          // Delete PDFs
          for (const pdfUrl of filesToDelete.pdfs) {
            await deleteFileFromLocalServer(pdfUrl);
          }

          // Delete Videos
          for (const videoUrl of filesToDelete.videos) {
            await deleteFileFromLocalServer(videoUrl);
          }
        } catch (fileError) {
          // If file deletion fails, show a warning but don't treat it as an error
          console.warn('Some files could not be deleted:', fileError);
          addToast({
            title: "Warning",
            description: "Lesson was deleted, but some files couldn't be removed from storage. You can delete them manually from your local computer.",
            variant: "default",
          });
        }
      }
    } catch (error) {
      // Database deletion failed - this is a critical error
      console.error('Error deleting lesson:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete lesson",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setLessonToDelete(null);
    }
  };

  const openDeleteCourseDialog = () => {
    setIsDeleteCourseDialogOpen(true);
  };

  const deleteCourse = async () => {
    setIsDeletingCourse(true);
    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete course');
      }

      // Navigate back to courses listing
      addToast({
        title: "Course deleted",
        description: `"${course?.name}" and all associated content have been deleted.`,
      });

      router.push('/courses');
    } catch (error) {
      console.error('Error deleting course:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete course",
        variant: "destructive"
      });
    } finally {
      setIsDeletingCourse(false);
      setIsDeleteCourseDialogOpen(false);
    }
  };

  if (!course || loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto p-4 md:p-6">
        <div className="mb-4">
          <Breadcrumb
            items={[
              { name: 'Courses', href: '/courses' },
              { name: course?.name || 'Current Course', href: `/courses/${id}` },
            ]}
          />
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
            <p className="text-lg text-gray-600 mt-2 max-w-2xl">{course.description}</p>
          </div>
          <div className="flex flex-shrink-0 gap-3 mt-4 md:mt-0">
            <Button
              onClick={() => setIsCreateLessonDialogOpen(true)}
              className="bg-gray-800 hover:bg-gray-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lesson
            </Button>
            <Button
              variant="outline"
              onClick={() => openDeleteCourseDialog()}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete Course
            </Button>
          </div>
        </div>

        <div className="my-6">
          {lessons.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-700">No lessons yet</h3>
              <p className="text-gray-500 mb-6">Start by creating your first lesson</p>
              <Button
                onClick={() => setIsCreateLessonDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Lesson
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col lg:flex-row">
                    {/* Lesson content */}
                    <div className="flex-grow p-5">
                      <div className="mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{lesson.title}</h3>
                        <p className="text-gray-600 mt-1">{lesson.description}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {lesson.pdfResources?.length || 0} PDFs
                        </span>

                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {lesson.videoResources?.length || 0} Videos
                        </span>
                      </div>
                    </div>

                    {/* Actions area - now with a reduced color palette */}
                    <div className="flex lg:flex-col flex-row justify-end p-4 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200">
                      <Button
                        variant="ghost"
                        onClick={() => handleViewResources(lesson.id)}
                        className="flex items-center justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100 mb-2 w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        <span>View Content</span>
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => handleEditLesson(lesson.id)}
                        className="flex items-center justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100 mb-2 w-full"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => openDeleteDialog(lesson)}
                        className="flex items-center justify-start text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        <span>Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <CreateLessonDialog
          courseId={id}
          open={isCreateLessonDialogOpen}
          onOpenChange={setIsCreateLessonDialogOpen}
          onLessonCreated={(lesson) => {
            setLessons((prev) => [...prev, lesson]);
          }}
        />

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the lesson &quot;{lessonToDelete?.title}&quot; and all associated PDFs, videos, chats, and messages. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteLesson}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? "Deleting..." : "Delete Lesson"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeleteCourseDialogOpen} onOpenChange={setIsDeleteCourseDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete entire course?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the course &quot;{course?.name}&quot; and ALL its lessons, PDFs, videos, chats, and messages. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingCourse}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteCourse}
                disabled={isDeletingCourse}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeletingCourse ? "Deleting..." : "Delete Course"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}