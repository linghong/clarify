"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus, Trash, Edit, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      const response = await fetch(`/api/courses/${id}/lessons/${lessonToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete lesson');
      }

      // Remove the deleted lesson from the state
      setLessons(lessons.filter(lesson => lesson.id !== lessonToDelete.id));

      addToast({
        title: "Lesson deleted",
        description: `"${lessonToDelete.title}" and all associated resources have been deleted.`,
      });
    } catch (error) {
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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-2">
        <div className="mb-3">
          <Breadcrumb
            items={[
              { name: 'Courses', href: '/courses' },
              { name: course?.name || 'Current Course', href: `/courses/${id}` },
            ]}
          />
        </div>

        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl font-bold">{course.name}</h1>
            <p className="text-muted-foreground">{course.description}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsCreateLessonDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Lesson
            </Button>
            <Button
              variant="outline"
              onClick={() => openDeleteCourseDialog()}
              className="hover:text-red-600"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete Course
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="py-2 px-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{lesson.title}</CardTitle>
                    <CardDescription>{lesson.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    PDFs: {lesson.pdfResources?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Videos: {lesson.videoResources?.length || 0}
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  onClick={() => handleEditLesson(lesson.id)}
                  className="mr-2"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleViewResources(lesson.id)}
                  className="mr-2"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Resources
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openDeleteDialog(lesson)}
                  className="mr-2 hover:text-red-600"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
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
                This will permanently delete the lesson "{lessonToDelete?.title}" and all associated PDFs, videos, chats, and messages. This action cannot be undone.
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
                This will permanently delete the course "{course?.name}" and ALL its lessons, PDFs, videos, chats, and messages. This action cannot be undone.
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