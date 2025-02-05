"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Header from "@/app/(internal)/components/Header";
import CreateCourseDialog from "@/app/(internal)/courses/components/CreateCourseDialog";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Add debug logs
  console.log("Courses page rendering, mounted:", mounted);

  const { loading } = useAuthCheck(setUserData, router, mounted, false); // Set redirectToDashboard to false

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted) {
      console.log("Fetching courses...");
      fetchCourses();
    }
  }, [loading, mounted]);

  const fetchCourses = async () => {
    try {
      console.log("Making fetch request to /api/courses");
      const response = await fetch('/api/courses');
      console.log("Response status:", response.status);

      if (!response.ok) {
        console.error("Failed to fetch courses:", await response.text());
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      console.log("Fetched courses:", data);
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

      // Navigate to the new course page
      router.push(`/courses/${course.id}`);

    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        title="Courses"
        userName={userData?.name || userData?.email || ''}
        currentPage="courses"
      />

      <main className="container mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Courses</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Course
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No courses yet. Create your first course to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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