"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Book, PlusCircle } from "lucide-react";

interface FirstTimeUserGuideProps {
  userId: string;
}

export default function FirstTimeUserGuide({ userId }: FirstTimeUserGuideProps) {
  const [showGuide, setShowGuide] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkUserCourses = async () => {
      try {
        // Check if user has any courses
        const response = await fetch('/api/courses', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          // If user has no courses, show the guide
          setShowGuide(data.courses.length === 0);
        }
      } catch (error) {
        console.error('Error checking user courses:', error);
      }
    };

    checkUserCourses();
  }, [userId]);

  const handleCreateCourse = () => {
    router.push('/courses?createNew=true');
    setShowGuide(false);
  };

  const handleCreateSampleCourse = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/courses/sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to the newly created sample course
        router.push(`/courses/${data.course.id}`);
      } else {
        console.error('Failed to create sample course');
      }
    } catch (error) {
      console.error('Error creating sample course:', error);
    } finally {
      setIsCreating(false);
      setShowGuide(false);
    }
  };

  return (
    <Dialog open={showGuide} onOpenChange={setShowGuide}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">Welcome to Clarify!</DialogTitle>
          <DialogDescription className="text-center text-lg">
            Get started with your learning journey
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 py-4">
          <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={handleCreateCourse}>
            <PlusCircle className="h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">Create My First Course</h3>
            <p className="text-gray-500">Organize your learning content your way</p>
          </div>

          <div className="flex flex-col items-center text-center p-6 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={handleCreateSampleCourse}>
            <Book className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">Try a Tutorial</h3>
            <p className="text-gray-500">Explore a pre-made course setup to see how to set up Clarify</p>
            {isCreating && <p className="text-sm text-blue-500 mt-2">Creating sample course...</p>}
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          You can always create more courses later from the Courses page
        </div>
      </DialogContent>
    </Dialog>
  );
} 