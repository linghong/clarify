"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import CreateCourseDialog from "@/app/(internal)/courses/components/CreateCourseDialog";
import { Course } from "@/lib/course";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { loading } = useAuthCheck(router, mounted);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted) {
      fetchCourses();
    }
  }, [loading, mounted]);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      if (!response.ok) throw new Error('Failed to fetch courses');
      const data = await response.json();
      setCourses(data.courses);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateCourse = async (name: string, description: string) => {
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        throw new Error('Failed to create course');
      }

      const { course } = await response.json();
      setIsCreateDialogOpen(false);

      // Refresh courses list
      await fetchCourses();

      // Navigate to the new course page
      router.push(`/courses/${course.id}`);
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto p-2">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Courses</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Course
          </Button>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No courses yet. Create your first course!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/courses/${course.id}`)}
              >
                <CardHeader>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>
                    {course.description}
                    <div className="mt-2 text-sm text-gray-500">
                      {course.lessonsCount} lessons • Last updated {new Date(course.updatedAt).toLocaleDateString()}
                    </div>
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        <CreateCourseDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={handleCreateCourse}
        />
      </main>
    </div>
  );
}