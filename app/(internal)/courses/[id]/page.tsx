"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@/entities/Course";
import Header from "@/app/(internal)/components/Header";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Unwrap params using React.use()
  const { id } = use(params);

  const { loading } = useAuthCheck(setUserData, router, mounted);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted) {
      fetchCourse();
    }
  }, [loading, mounted, id]); // Changed from params.id to id

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${id}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      setCourse(data.course);
    } catch (error) {
      console.error('Error:', error);
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
        title={course?.name || "Course"}
        userName={userData?.name || userData?.email || ''}
        currentPage="courses"
      />

      <main className="container mx-auto py-6 px-4">
        {course ? (
          <div>
            <h1 className="text-2xl font-bold mb-4">{course.name}</h1>
            <p className="text-gray-600">{course.description}</p>
            {/* Add lessons list and other course content here */}
          </div>
        ) : (
          <div>Course not found</div>
        )}
      </main>
    </div>
  );
}