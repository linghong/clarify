"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Video, MessageSquare, ChevronRight } from "lucide-react";
import Link from "next/link";
import Header from "@/app/(internal)/components/Header";
import { useAuthCheck } from "@/app/(internal)/dashboard/hooks/useAuthCheck";

interface Course {
  id: number;
  name: string;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
}

interface Resource {
  id: string;
  name: string;
  filename: string;
  createdAt: string;
  locations: { path: string }[];
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [pdfs, setPdfs] = useState<Resource[]>([]);
  const [videos, setVideos] = useState<Resource[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const { loading } = useAuthCheck(setUserData, router, mounted);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && mounted) {
      fetchCourseData();
      fetchLessonData();
    }
  }, [loading, mounted, params.id, params.lessonId]);

  const fetchCourseData = async () => {
    try {
      const response = await fetch(`/api/courses/${params.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      setCourse(data.course);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchLessonData = async () => {
    try {
      // Fetch lesson details
      const lessonResponse = await fetch(`/api/courses/${params.id}/lessons/${params.lessonId}`, {
        credentials: 'include'
      });
      const lessonData = await lessonResponse.json();
      setLesson(lessonData.lesson);

      // Fetch PDFs
      const pdfsResponse = await fetch(`/api/courses/${params.id}/lessons/${params.lessonId}/pdfs`, {
        credentials: 'include'
      });
      const pdfsData = await pdfsResponse.json();
      setPdfs(pdfsData.pdfs);

      // Fetch videos
      const videosResponse = await fetch(`/api/courses/${params.id}/lessons/${params.lessonId}/videos`, {
        credentials: 'include'
      });
      const videosData = await videosResponse.json();
      setVideos(videosData.videos);

      // Fetch chats
      const chatsResponse = await fetch(`/api/courses/${params.id}/lessons/${params.lessonId}/chats`, {
        credentials: 'include'
      });
      const chatsData = await chatsResponse.json();
      setChats(chatsData.chats);
    } catch (error) {
      console.error('Error fetching lesson data:', error);
    }
  };

  const handlePdfClick = (pdf: Resource) => {
    const localPdfUrl = `http://127.0.0.1:8000/uploads/${pdf.name}`;
    router.push(`/dashboard?pdfName=${encodeURIComponent(pdf.name)}`);

  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header
        title={lesson?.title || 'Lesson'}
        userName={userData?.name || userData?.email || ''}
        currentPage="courses"
      />

      <main className="container mx-auto py-6 px-4">
        <nav className="flex mb-6 items-center text-sm text-gray-500">
          <Link
            href="/courses"
            className="hover:text-gray-700"
          >
            Courses
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link
            href={`/courses/${params.id}`}
            className="hover:text-gray-700"
          >
            {course?.name || 'Current Course'}
          </Link>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="text-gray-900 font-medium">
            {lesson?.title || 'Current Lesson'}
          </span>
        </nav>

        <div className="mb-2">
          <p className="text-gray-600 text-xl font-bold">{lesson?.title}</p>
          <p className="text-gray-600">{lesson?.description}</p>
        </div>

        <Tabs defaultValue="pdfs">
          <TabsList>
            <TabsTrigger value="pdfs" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDFs ({pdfs.length})
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Chats ({chats.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdfs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pdfs.map(pdf => (
                <Card
                  key={pdf.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handlePdfClick(pdf)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base truncate">{pdf.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        {new Date(pdf.createdAt).toLocaleDateString()}
                      </p>
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                      >
                        Open in Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {pdfs.length === 0 && (
              <p className="text-center text-gray-500 py-8">No PDFs available for this lesson</p>
            )}
          </TabsContent>

          <TabsContent value="videos">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map(video => (
                <Card key={video.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{video.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Added {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                    <Button
                      variant="link"
                      className="mt-2 p-0"
                      onClick={() => window.open(video.locations[0].path, '_blank')}
                    >
                      Watch Video
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {videos.length === 0 && (
              <p className="text-center text-gray-500 py-8">No videos available for this lesson</p>
            )}
          </TabsContent>

          <TabsContent value="chats">
            <div className="space-y-4">
              {chats.map(chat => (
                <Card key={chat.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded ${chat.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                        {chat.message}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(chat.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {chats.length === 0 && (
              <p className="text-center text-gray-500 py-8">No chat history for this lesson</p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}