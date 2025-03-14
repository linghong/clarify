"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";
import CreateCourseDialog from "@/app/(internal)/courses/components/CreateCourseDialog";
import { Course } from "@/types/course";
import { useToast } from "@/components/common/Toast";
import { deleteCourseDirectoryFromLocalServer } from "@/lib/fileUtils";
import FirstTimeUserGuide from "@/app/(internal)/components/FirstTimeUserGuide";
import DeleteConfirmationDialog from "@/components/common/DeleteConfirmationDialog";

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { addToast } = useToast();
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userId, setUserId] = useState<string>("");

  const { loading } = useAuthCheck(router, mounted);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted) {
      fetchCourses();
    }
  }, [loading, mounted]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setUserId(data.user.id);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);


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

  const openDeleteDialog = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourseToDelete(course);
    setIsDeleteDialogOpen(true);
  };

  const deleteCourse = async () => {
    if (!courseToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/courses/${courseToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete course');
      }

      setCourses(courses.filter(course => course.id !== courseToDelete.id));

      // delete the entire course directory and files
      try {
        const dirDeleteResult = await deleteCourseDirectoryFromLocalServer(courseToDelete.id);

        if (dirDeleteResult.success) {
          addToast({
            title: "Course deleted",
            description: `"${courseToDelete.name}" and all associated content have been deleted.`,
          });
          return; // Exit early if the directory deletion was successful
        } else {
          console.warn('Could not delete course directory, falling back to individual file deletion');
        }
      } catch (dirError) {
        console.warn('Course directory deletion failed:', dirError);
        // Continue to individual file deletion
      }

    } catch (error) {
      console.error('Error deleting course:', error);
      addToast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete course",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setCourseToDelete(null);
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
      {userId && <FirstTimeUserGuide userId={userId} />}
      <main className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Course Catalog</h1>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-gray-800 text-white hover:bg-gray-600">
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
              <div key={course.id} className="relative h-full">
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow h-full flex flex-col bg-blue-50 border border-gray-200"
                  onClick={() => router.push(`/courses/${course.id}`)}
                >
                  <CardHeader className="flex-1 flex flex-col p-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="line-clamp-1 text-lg font-semibold text-gray-900">{course.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-red-600 shrink-0 -mt-1 -mr-2"
                        onClick={(e) => openDeleteDialog(course, e)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 flex flex-col justify-between mt-2">
                      <CardDescription className="line-clamp-2 text-gray-700">
                        {course.description || "No description provided"}
                      </CardDescription>
                      <div className="mt-4 text-sm text-gray-500">
                        {course.lessonsCount} lessons • Last updated {new Date(course.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            ))}
          </div>
        )}

        <CreateCourseDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={handleCreateCourse}
        />

        <DeleteConfirmationDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title="Delete course?"
          description={`This will permanently delete the course "${courseToDelete?.name}" and ALL its lessons, PDFs, videos, chats, and messages. This action cannot be undone.`}
          isDeleting={isDeleting}
          onConfirm={deleteCourse}
          confirmText="Delete Course"
        />
      </main>
    </div>
  );
}