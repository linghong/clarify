"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/app/(internal)/components/Header";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";
import CreateLessonDialog from "@/app/(internal)/courses/components/CreateLessonDialog";
import { UserData } from "@/types/auth";

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isCreateLessonDialogOpen, setIsCreateLessonDialogOpen] = useState(false);

  const { loading } = useAuthCheck(setUserData, router, mounted);

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

  if (!course) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        userName={userData?.name || userData?.email || ''}
        currentPage="courses"
      />
      <main className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{course.name}</h1>
            <p className="text-muted-foreground">{course.description}</p>
          </div>
          <Button onClick={() => setIsCreateLessonDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Lesson
          </Button>
        </div>

        <div className="space-y-4">
          {lessons.map((lesson) => (
            <Card key={lesson.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle>{lesson.title}</CardTitle>
                <CardDescription>{lesson.description}</CardDescription>
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
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleViewResources(lesson.id)}
                >
                  View Resources
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
      </main>
    </div>
  );
}