"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/app/(internal)/components/Header";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import { Course } from "@/entities/Course";
import { Lesson } from "@/entities/Lesson";

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const { loading } = useAuthCheck(setUserData, router, mounted);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted && id) {
      fetchCourse();
      fetchLessons();
    }
  }, [loading, mounted, id]);

  const fetchCourse = async () => {
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
  };

  const fetchLessons = async () => {
    try {
      const response = await fetch(`/api/courses/${id}/lessons`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lessons');
      }

      const data = await response.json();
      setLessons(data.lessons);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    }
  };

  const handleEditLesson = (lessonId: number) => {
    // TODO: Implement edit lesson
    console.log('Edit lesson:', lessonId);
  };

  const handleViewResources = (lessonId: number) => {
    router.push(`/courses/${id}/lessons/${lessonId}/resources`);
  };

  if (!course) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        title={course.name}
        userName={userData?.name || userData?.email || ''}
        currentPage="courses"
      />
      <main className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">{course.name}</h1>
            <p className="text-muted-foreground">{course.description}</p>
          </div>
          <Button onClick={() => { }}>
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
                <p className="text-sm text-muted-foreground">
                  {lesson.resources?.length || 0} {lesson.resources?.length === 1 ? 'resource' : 'resources'}
                </p>
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
      </main>
    </div>
  );
}